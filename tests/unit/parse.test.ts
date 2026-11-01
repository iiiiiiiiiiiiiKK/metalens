import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseHtml } from '../../src/lib/parse';

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), 'tests/unit/fixtures', name), 'utf8');

const SOURCE = 'https://example.com/complete';

describe('HTML parsing', () => {
  it('parses a document and reports it as parsed', () => {
    const { doc, report } = parseHtml(fixture('complete.html'), { sourceUrl: SOURCE });
    expect(report.parsed).toBe(true);
    expect(report.truncated).toBe(false);
    expect(doc.sourceUrl).toBe(SOURCE);
  });

  it('returns an empty document for blank input without throwing', () => {
    const { doc, report } = parseHtml('   ');
    expect(report.parsed).toBe(false);
    expect(doc.title).toBe('');
    expect(doc.og.image).toBe('');
  });

  it('survives malformed markup', () => {
    const { doc } = parseHtml(
      '<title>Broken</title><meta name=description content=hello><div><p>unclosed<div></span>',
    );
    expect(doc.title).toBe('Broken');
    expect(doc.description).toBe('hello');
  });

  it('keeps unclosed tags inside the element that owns them', () => {
    // An unclosed <title> swallows what follows — browsers do the same, and we
    // must not pretend otherwise.
    const { doc } = parseHtml('<title>Broken<meta name="description" content="x">');
    expect(doc.title).toContain('Broken');
    expect(doc.description).toBe('');
  });

  it('never executes scripts or loads sub-resources', () => {
    const html = `<title>t</title><script>window.__pwned = true;</script>
      <img src="https://example.com/track.gif" />`;
    parseHtml(html, { sourceUrl: SOURCE });
    expect((globalThis as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
    // Parsing is inert: nothing is attached to the live document.
    expect(document.body.querySelector('img')).toBeNull();
  });

  it('collapses whitespace and decodes entities in values', () => {
    const { doc } = parseHtml(
      `<title>  Hello   &amp;   welcome  </title>
       <meta name="description" content="A &lt;b&gt; bold &amp; line
       break" />`,
    );
    expect(doc.title).toBe('Hello & welcome');
    expect(doc.description).toBe('A <b> bold & line break');
  });
});

describe('meta tag extraction', () => {
  it('extracts the basic fields', () => {
    const { doc } = parseHtml(fixture('complete.html'), { sourceUrl: SOURCE });
    expect(doc.title).toBe('Complete sample — every tag present');
    expect(doc.description).toContain('meta tags are complete');
    expect(doc.canonical).toBe('https://example.com/complete');
    expect(doc.lang).toBe('en-GB');
    expect(doc.robots).toBe('index, follow');
    expect(doc.viewport).toBe('width=device-width, initial-scale=1');
    expect(doc.favicon).toBe('https://example.com/icon.png');
  });

  it('reads rel="shortcut icon" and apple-touch-icon', () => {
    const { doc } = parseHtml('<link rel="shortcut icon" href="https://e.com/f.ico">');
    expect(doc.favicon).toBe('https://e.com/f.ico');
    const short = parseHtml('<link rel="apple-touch-icon" href="/touch.png">');
    expect(short.doc.favicon).toBe('/touch.png');
  });

  it('is case-insensitive about meta keys', () => {
    const { doc } = parseHtml(
      '<meta property="OG:TITLE" content="Upper">\n<meta NAME="Description" content="d">',
    );
    expect(doc.og.title).toBe('Upper');
    expect(doc.description).toBe('d');
  });

  it('accepts name= instead of property= for Open Graph tags', () => {
    const { doc } = parseHtml('<meta name="og:title" content="From name attribute">');
    expect(doc.og.title).toBe('From name attribute');
  });

  it('records keys it does not model instead of dropping them', () => {
    const { report } = parseHtml('<meta name="theme-color" content="#000">');
    expect(report.other).toEqual([{ key: 'theme-color', value: '#000' }]);
  });
});

describe('Open Graph extraction', () => {
  it('maps every supported og field', () => {
    const { doc } = parseHtml(fixture('complete.html'), { sourceUrl: SOURCE });
    expect(doc.og).toEqual({
      title: 'Complete sample — every tag present',
      description: 'A page whose meta tags are complete.',
      image: 'https://example.com/cover.png',
      imageAlt: 'Cover image',
      url: 'https://example.com/complete',
      type: 'article',
      siteName: 'Example',
      locale: 'en_GB',
    });
  });

  it('treats og:image:url and og:image:secure_url as og:image aliases', () => {
    const { doc, report } = parseHtml(
      '<meta property="og:image:url" content="https://cdn.example.com/a.png">',
    );
    expect(doc.og.image).toBe('https://cdn.example.com/a.png');
    expect(report.duplicates['og:image']).toBeUndefined();
  });
});

describe('X Card extraction', () => {
  it('maps every supported twitter field', () => {
    const { doc } = parseHtml(fixture('complete.html'), { sourceUrl: SOURCE });
    expect(doc.twitter).toEqual({
      card: 'summary_large_image',
      title: 'Complete sample',
      description: 'Twitter specific description.',
      image: 'https://example.com/twitter.png',
      site: '@example',
      creator: '@author',
    });
  });

  it('supports the legacy twitter:image:src alias', () => {
    const { doc } = parseHtml('<meta name="twitter:image:src" content="https://x.com/a.png">');
    expect(doc.twitter.image).toBe('https://x.com/a.png');
  });
});

describe('duplicate detection', () => {
  it('records every duplicated key in document order', () => {
    const { report, doc } = parseHtml(fixture('duplicates.html'));
    expect(report.duplicates['description']).toEqual([
      'First description.',
      'Second description.',
      '',
    ]);
    expect(report.duplicates['og:image']?.length).toBeGreaterThanOrEqual(3);
    // First non-empty value wins, matching what scrapers do.
    expect(doc.og.image).toBe('/images/relative-cover.jpg');
  });

  it('counts <title> elements', () => {
    const { report } = parseHtml(fixture('duplicates.html'));
    expect(report.titleCount).toBe(2);
    expect(report.duplicates['title']).toEqual(['Duplicate tags everywhere', 'Second title element']);
  });

  it('does not flag a single occurrence', () => {
    const { report } = parseHtml(fixture('complete.html'));
    expect(report.duplicates['og:title']).toBeUndefined();
  });
});

describe('empty field detection', () => {
  it('lists blank attributes', () => {
    const { report } = parseHtml(fixture('duplicates.html'));
    expect(report.emptyKeys).toContain('description');
  });

  it('treats an empty content attribute as empty, not missing', () => {
    const { doc, report } = parseHtml('<meta property="og:image" content="   ">');
    expect(doc.og.image).toBe('');
    expect(report.emptyKeys).toContain('og:image');
  });
});

describe('parse report metadata', () => {
  it('exposes the base href', () => {
    const { report } = parseHtml('<base href="https://cdn.example.com/assets/">');
    expect(report.baseHref).toBe('https://cdn.example.com/assets/');
  });

  it('flags truncation for oversized input', () => {
    const huge = `<title>big</title>${'<meta name="x" content="y">'.repeat(200_000)}`;
    const { report } = parseHtml(huge);
    expect(report.truncated).toBe(true);
  });
});
