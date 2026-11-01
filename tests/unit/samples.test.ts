import { describe, expect, it } from 'vitest';
import { analyze, problems } from '../../src/lib/analysis';
import { parseHtml } from '../../src/lib/parse';
import { SAMPLES, getSample } from '../../src/lib/samples';
import { hasTranslation } from '../../src/i18n';

describe('built-in samples', () => {
  it('every sample has unique ids and translated labels', () => {
    const ids = SAMPLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const sample of SAMPLES) {
      expect(hasTranslation('en', sample.labelKey), sample.labelKey).toBe(true);
      expect(hasTranslation('zh', sample.labelKey), sample.labelKey).toBe(true);
      expect(hasTranslation('en', sample.descriptionKey), sample.descriptionKey).toBe(true);
      expect(hasTranslation('zh', sample.descriptionKey), sample.descriptionKey).toBe(true);
    }
  });

  it('every sample parses as a demo document', () => {
    for (const sample of SAMPLES) {
      const { doc, report } = parseHtml(sample.html, { sourceUrl: sample.url, mode: 'sample' });
      expect(report.mode, sample.id).toBe('sample');
      expect(report.parsed, sample.id).toBe(true);
      expect(doc.title.length, sample.id).toBeGreaterThan(0);
    }
  });

  it('the complete sample has no problems', () => {
    const sample = getSample('complete')!;
    const { doc, report } = parseHtml(sample.html, { sourceUrl: sample.url, mode: 'sample' });
    const findings = analyze(doc, report, [
      { url: `${sample.url}og-cover.png`, status: 'ok', width: 1200, height: 630 },
    ]).filter((f) => f.group !== 'image');
    expect(problems(findings)).toEqual([]);
  });

  it('the classic-tags sample is missing Open Graph and X Cards', () => {
    const sample = getSample('no-og')!;
    const { doc, report } = parseHtml(sample.html, { sourceUrl: sample.url, mode: 'sample' });
    const codes = analyze(doc, report).map((f) => f.code);
    expect(codes).toContain('og.missing');
    expect(codes).toContain('twitter.missing');
    expect(codes).toContain('canonical.missing');
  });

  it('the messy sample exposes duplicates, noindex and an invalid card type', () => {
    const sample = getSample('messy')!;
    const { doc, report } = parseHtml(sample.html, { sourceUrl: sample.url, mode: 'sample' });
    const codes = analyze(doc, report).map((f) => f.code);
    expect(codes).toContain('title.duplicate');
    expect(codes).toContain('description.duplicate');
    expect(codes).toContain('robots.noindex');
    expect(codes).toContain('twitter.card.invalid');
    expect(codes).toContain('viewport.invalid');
    expect(codes).toContain('og.image.relative');
    // relative canonical is resolved against the demo URL
    const canonical = analyze(doc, report).find((f) => f.code === 'canonical.relative');
    expect(canonical?.params?.resolved).toBe('https://shop.example.com/summer-2026/');
  });

  it('returns undefined for an unknown sample id', () => {
    expect(getSample('nope')).toBeUndefined();
  });
});
