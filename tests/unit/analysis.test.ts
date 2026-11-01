import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyze, groupFindings, problems } from '../../src/lib/analysis';
import { emptyDoc } from '../../src/lib/fields';
import { parseHtml } from '../../src/lib/parse';
import type { Finding, ImageProbe, MetaDoc, ParseResult } from '../../src/lib/types';

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), 'tests/unit/fixtures', name), 'utf8');

function check(
  html: string,
  options: { sourceUrl?: string; probes?: ImageProbe[] } = {},
): Finding[] {
  const parsed: ParseResult = parseHtml(html, { sourceUrl: options.sourceUrl ?? '' });
  return analyze(parsed.doc, parsed.report, options.probes ?? []);
}

const codes = (findings: Finding[]) => findings.map((f) => f.code);
const byKey = (findings: Finding[], key: string) => findings.filter((f) => f.field === key);

const okProbe = (url: string, width = 1200, height = 630): ImageProbe => ({
  url,
  status: 'ok',
  width,
  height,
});

describe('complete document', () => {
  const probes = [
    okProbe('https://example.com/cover.png'),
    okProbe('https://example.com/twitter.png'),
  ];
  const findings = check(fixture('complete.html'), {
    sourceUrl: 'https://example.com/complete',
    probes,
  });

  it('reports no problems at all', () => {
    expect(problems(findings)).toEqual([]);
  });

  it('produces unique finding ids', () => {
    const ids = findings.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('groups findings into the four check groups', () => {
    const grouped = groupFindings(findings);
    expect(Object.keys(grouped)).toEqual(['basic', 'og', 'twitter', 'image']);
    expect(grouped.image.length).toBe(2);
  });
});

describe('missing Open Graph', () => {
  const findings = check(fixture('missing-og.html'), {
    sourceUrl: 'https://example.com/missing',
  });

  it('flags every missing og field', () => {
    for (const key of [
      'og:title',
      'og:description',
      'og:image',
      'og:url',
      'og:type',
      'og:site_name',
      'og:locale',
    ]) {
      const row = byKey(findings, key).find((f) => f.group === 'og');
      expect(row, key).toBeDefined();
      expect(row?.code).toBe('og.missing');
      expect(row?.status).toBe('warning');
    }
  });

  it('explains the fallback when one exists', () => {
    const fallback = findings.find((f) => f.code === 'og.fallback' && f.field === 'og:title');
    expect(fallback?.params?.fallback).toBe('title');
  });

  it('flags a relative canonical and a missing viewport', () => {
    expect(codes(findings)).toContain('canonical.relative');
    expect(codes(findings)).toContain('viewport.missing');
    expect(codes(findings)).toContain('lang.missing');
  });

  it('reports missing X Card fields when there is nothing to fall back to', () => {
    const card = byKey(findings, 'twitter:card').find((f) => f.group === 'twitter');
    expect(card?.code).toBe('twitter.missing');
    expect(card?.status).toBe('warning');
  });
});

describe('duplicate and empty tags', () => {
  const findings = check(fixture('duplicates.html'));

  it('reports duplicated description with the values shown', () => {
    const row = findings.find((f) => f.code === 'description.duplicate');
    expect(row?.status).toBe('warning');
    expect(row?.params?.count).toBe(3);
  });

  it('reports duplicated title elements', () => {
    expect(codes(findings)).toContain('title.duplicate');
  });

  it('reports duplicated og:image', () => {
    const row = findings.find((f) => f.code === 'og.duplicate' && f.field === 'og:image');
    expect(row).toBeDefined();
    expect(Number(row?.params?.count)).toBeGreaterThanOrEqual(3);
  });

  it('rejects an invalid twitter:card value', () => {
    const row = byKey(findings, 'twitter:card').find((f) => f.group === 'twitter');
    expect(row?.code).toBe('twitter.card.invalid');
    expect(row?.params?.value).toBe('huge_card');
  });
});

describe('image handling', () => {
  it('resolves a relative og:image and says where it points', () => {
    const findings = check(fixture('broken-image.html'), {
      sourceUrl: 'https://example.com/page',
    });
    const row = findings.find((f) => f.code === 'og.image.relative');
    expect(row?.params?.resolved).toBe('https://example.com/images/cover.jpg');
  });

  it('rejects a javascript: image URL', () => {
    const findings = check(fixture('broken-image.html'), {
      sourceUrl: 'https://example.com/page',
    });
    const row = findings.find((f) => f.code === 'image.invalid' && f.field === 'twitter:image');
    expect(row).toBeDefined();
  });

  it('reports the real dimensions when the probe succeeds', () => {
    const findings = check('<meta property="og:image" content="https://e.com/a.png">', {
      probes: [okProbe('https://e.com/a.png', 1200, 630)],
    });
    const row = findings.find((f) => f.group === 'image');
    expect(row?.code).toBe('image.ok');
    expect(row?.params).toMatchObject({ w: 1200, h: 630 });
  });

  it('warns about tiny images', () => {
    const findings = check('<meta property="og:image" content="https://e.com/a.png">', {
      probes: [okProbe('https://e.com/a.png', 120, 90)],
    });
    expect(findings.find((f) => f.group === 'image')?.code).toBe('image.tooSmall');
  });

  it('warns about square images that will be cropped', () => {
    const findings = check('<meta property="og:image" content="https://e.com/a.png">', {
      probes: [okProbe('https://e.com/a.png', 800, 800)],
    });
    expect(findings.find((f) => f.group === 'image')?.code).toBe('image.aspect');
  });

  it('never invents a size when the image cannot load', () => {
    const findings = check('<meta property="og:image" content="https://e.com/a.png">', {
      probes: [{ url: 'https://e.com/a.png', status: 'error', error: 'load-failed' }],
    });
    const row = findings.find((f) => f.group === 'image');
    expect(row?.code).toBe('image.unreachable');
    expect(row?.status).toBe('unverified');
    expect(row?.params?.w).toBeUndefined();
  });

  it('marks a timed-out probe as unverified', () => {
    const findings = check('<meta property="og:image" content="https://e.com/a.png">', {
      probes: [{ url: 'https://e.com/a.png', status: 'timeout' }],
    });
    const row = findings.find((f) => f.group === 'image');
    expect(row?.code).toBe('image.timeout');
    expect(row?.status).toBe('unverified');
  });

  it('marks an unprobed image as unverified rather than ok', () => {
    const findings = check('<meta property="og:image" content="https://e.com/a.png">');
    expect(findings.find((f) => f.group === 'image')?.code).toBe('image.notChecked');
  });
});

describe('length advisories', () => {
  it('warns on a very long title and a very short description', () => {
    const longTitle = 'x'.repeat(90);
    const findings = check(
      `<title>${longTitle}</title><meta name="description" content="short">`,
    );
    expect(findings.find((f) => f.code === 'title.long')?.params?.len).toBe(90);
    expect(findings.find((f) => f.code === 'description.short')?.params?.len).toBe(5);
  });

  it('counts characters, not UTF-16 units', () => {
    const cjk = check(`<title>${'中'.repeat(20)}</title>`);
    expect(cjk.find((f) => f.code === 'title.ok')?.params?.len).toBe(20);

    // 30 emoji are 60 UTF-16 units but 30 characters, so this stays acceptable.
    const emoji = check(`<title>${'😀'.repeat(30)}</title>`);
    expect(emoji.find((f) => f.code === 'title.ok')?.params?.len).toBe(30);
    expect(codes(emoji)).not.toContain('title.long');
  });
});

describe('canonical and robots', () => {
  it('detects a canonical that points elsewhere', () => {
    const findings = check('<link rel="canonical" href="https://example.com/other">', {
      sourceUrl: 'https://example.com/page',
    });
    const row = findings.find((f) => f.code === 'canonical.mismatch');
    expect(row?.params).toMatchObject({
      canonical: 'https://example.com/other',
      current: 'https://example.com/page',
    });
  });

  it('accepts a canonical that only differs by a trailing slash', () => {
    const findings = check('<link rel="canonical" href="https://example.com/page/">', {
      sourceUrl: 'https://example.com/page',
    });
    expect(codes(findings)).not.toContain('canonical.mismatch');
    expect(codes(findings)).toContain('canonical.ok');
  });

  it('warns about noindex', () => {
    const findings = check('<meta name="robots" content="noindex, follow">');
    expect(findings.find((f) => f.code === 'robots.noindex')?.status).toBe('warning');
  });

  it('treats a missing robots tag as fine', () => {
    const findings = check('<title>t</title>');
    expect(findings.find((f) => f.field === 'robots')?.code).toBe('robots.ok');
  });
});

describe('og:url consistency', () => {
  it('flags og:url that disagrees with canonical', () => {
    const findings = check(
      `<link rel="canonical" href="https://example.com/a">
       <meta property="og:url" content="https://example.com/b">`,
      { sourceUrl: 'https://example.com/a' },
    );
    expect(codes(findings)).toContain('og.url.mismatch');
  });
});

describe('empty document', () => {
  it('produces a finding for every modelled field and never a fake score', () => {
    const doc: MetaDoc = emptyDoc('');
    const parsed = parseHtml('<html><head></head><body></body></html>');
    const findings = analyze(doc, parsed.report);
    expect(findings.length).toBeGreaterThan(15);
    expect(findings.some((f) => f.status === 'missing')).toBe(true);
    expect(findings.every((f) => f.code !== 'title.ok')).toBe(true);
  });
});
