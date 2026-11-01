import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../../src/lib/fields';
import {
  DEFAULT_CODEGEN_OPTIONS,
  generateMetaTags,
  generateTag,
  generateTagList,
} from '../../src/lib/codegen';

function docWith(overrides: Partial<ReturnType<typeof emptyDoc>> = {}) {
  const doc = emptyDoc('https://example.com/page');
  doc.title = 'Example title';
  doc.description = 'Example description';
  doc.canonical = 'https://example.com/page';
  doc.og.title = 'Example title';
  doc.og.description = 'Example description';
  doc.og.image = 'https://example.com/cover.png';
  doc.og.type = 'website';
  doc.og.url = 'https://example.com/page';
  doc.og.siteName = 'Example';
  doc.og.locale = 'en_US';
  doc.twitter.card = 'summary_large_image';
  doc.twitter.site = '@example';
  return { ...doc, ...overrides };
}

describe('generateTag', () => {
  it('uses property= for Open Graph and name= for everything else', () => {
    expect(generateTag('og:title', 'T')).toBe('<meta property="og:title" content="T" />');
    expect(generateTag('twitter:card', 'summary')).toBe(
      '<meta name="twitter:card" content="summary" />',
    );
    expect(generateTag('description', 'D')).toBe('<meta name="description" content="D" />');
  });

  it('returns an empty string for blank values', () => {
    expect(generateTag('og:title', '   ')).toBe('');
    expect(generateTag('og:title', '')).toBe('');
  });

  it('escapes quotes and angle brackets in the content', () => {
    expect(generateTag('og:title', 'He said "hi" & <left>')).toBe(
      '<meta property="og:title" content="He said &quot;hi&quot; &amp; &lt;left&gt;" />',
    );
  });

  it('flattens newlines', () => {
    expect(generateTag('og:description', 'a\nb')).toBe(
      '<meta property="og:description" content="a b" />',
    );
  });
});

describe('generateMetaTags', () => {
  it('emits title, canonical and the mapped tags in a stable order', () => {
    const code = generateMetaTags(docWith());
    const lines = code.split('\n');
    expect(lines[0]).toBe('<title>Example title</title>');
    expect(lines[1]).toBe('<link rel="canonical" href="https://example.com/page" />');
    expect(code).toContain('<meta name="description"');
    expect(code.indexOf('og:title')).toBeLessThan(code.indexOf('og:image'));
    expect(code.indexOf('og:image')).toBeLessThan(code.indexOf('twitter:card'));
  });

  it('omits every empty field instead of emitting empty tags', () => {
    const code = generateMetaTags(emptyDoc(''));
    expect(code).toBe('');
  });

  it('honours the include switches', () => {
    const doc = docWith();
    doc.robots = 'index, follow';
    doc.viewport = 'width=device-width, initial-scale=1';

    const withoutOg = generateMetaTags(doc, { ...DEFAULT_CODEGEN_OPTIONS, includeOg: false });
    expect(withoutOg).not.toContain('og:title');
    expect(withoutOg).toContain('twitter:card');

    const withAll = generateMetaTags(doc, {
      ...DEFAULT_CODEGEN_OPTIONS,
      includeRobots: true,
      includeViewport: true,
    });
    expect(withAll).toContain('<meta name="robots" content="index, follow" />');
    expect(withAll).toContain('<meta name="viewport" content="width=device-width, initial-scale=1" />');

    const noTitle = generateMetaTags(doc, { ...DEFAULT_CODEGEN_OPTIONS, includeTitle: false });
    expect(noTitle).not.toContain('<title>');

    const noTwitter = generateMetaTags(doc, { ...DEFAULT_CODEGEN_OPTIONS, includeTwitter: false });
    expect(noTwitter).not.toContain('twitter:');
  });

  it('adds an html lang reminder comment when a language is set', () => {
    const doc = docWith({ lang: 'zh-CN' });
    expect(generateMetaTags(doc)).toContain('lang="zh-CN"');
  });

  it('produces markup with balanced quotes for hostile input', () => {
    const doc = docWith({ title: '</title><script>alert(1)</script>' });
    const code = generateMetaTags(doc);
    expect(code).not.toContain('<script>');
    expect(code.match(/<title>/g)).toHaveLength(1);
  });
});

describe('generateTagList', () => {
  it('returns one entry per emitted tag with its own snippet', () => {
    const tags = generateTagList(docWith());
    expect(tags.length).toBeGreaterThan(5);
    for (const tag of tags) {
      expect(tag.tag.startsWith('<meta ')).toBe(true);
      expect(tag.value).not.toBe('');
    }
    expect(tags.map((t) => t.key)).toContain('og:image');
  });

  it('skips blank values', () => {
    const doc = docWith();
    doc.twitter.site = '';
    const keys = generateTagList(doc).map((t) => t.key);
    expect(keys).not.toContain('twitter:site');
  });
});
