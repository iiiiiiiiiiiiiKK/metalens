import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTranslator, en, hasTranslation, LOCALES, translate, zh } from '../../src/i18n';
import { FIELDS } from '../../src/lib/fields';

const analysisSource = readFileSync(
  join(process.cwd(), 'src/lib/analysis.ts'),
  'utf8',
);

describe('dictionary integrity', () => {
  it('ships every locale', () => {
    expect(LOCALES).toEqual(['en', 'zh']);
  });

  it('has the same keys in both languages', () => {
    const enKeys = Object.keys(en).sort();
    const zhKeys = Object.keys(zh).sort();
    const missingInZh = enKeys.filter((k) => !(k in zh));
    const missingInEn = zhKeys.filter((k) => !(k in en));
    expect(missingInZh, `missing in zh: ${missingInZh.join(', ')}`).toEqual([]);
    expect(missingInEn, `missing in en: ${missingInEn.join(', ')}`).toEqual([]);
  });

  it('never ships an empty string', () => {
    for (const [key, value] of Object.entries({ ...en, ...zh })) {
      expect(value.trim().length, key).toBeGreaterThan(0);
    }
  });
});

describe('analysis codes are all translated', () => {
  const codes = Array.from(analysisSource.matchAll(/code:\s*'([a-z0-9._:]+)'/gi)).map(
    (m) => m[1],
  );

  it('finds the codes in the source', () => {
    expect(codes.length).toBeGreaterThan(20);
  });

  it.each(codes)('issue.%s exists in both languages', (code) => {
    expect(hasTranslation('en', `issue.${code}`), `en issue.${code}`).toBe(true);
    expect(hasTranslation('zh', `issue.${code}`), `zh issue.${code}`).toBe(true);
  });
});

describe('field suggestions are translated', () => {
  it.each(FIELDS.map((f) => f.key))('fix.field.%s exists in both languages', (key) => {
    expect(hasTranslation('en', `fix.field.${key}`), `en fix.field.${key}`).toBe(true);
    expect(hasTranslation('zh', `fix.field.${key}`), `zh fix.field.${key}`).toBe(true);
  });
});

describe('translate', () => {
  it('interpolates named parameters', () => {
    expect(translate('en', 'health.problems', { n: 3 })).toBe('3 issues');
    expect(translate('zh', 'health.problems', { n: 3 })).toBe('3 个问题');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(translate('en', 'health.problems', {})).toBe('{n} issues');
  });

  it('falls back to English for a key missing in the requested locale', () => {
    expect(translate('zh', 'app.name')).toBe('MetaLens');
  });

  it('returns the key when it exists nowhere', () => {
    expect(translate('en', 'totally.unknown.key')).toBe('totally.unknown.key');
  });

  it('exposes a bound translator', () => {
    const t = createTranslator('zh');
    expect(t('status.ok')).toBe('正常');
  });
});
