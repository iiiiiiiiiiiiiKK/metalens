import { describe, expect, it } from 'vitest';
import {
  escapeHtmlAttr,
  escapeHtmlText,
  normalizeAttrValue,
} from '../../src/lib/escape';

describe('escapeHtmlAttr', () => {
  it('escapes every character that can break an attribute', () => {
    expect(escapeHtmlAttr('a & b')).toBe('a &amp; b');
    expect(escapeHtmlAttr('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtmlAttr('say "hi"')).toBe('say &quot;hi&quot;');
    expect(escapeHtmlAttr("it's")).toBe('it&#39;s');
  });

  it('escapes ampersands before anything else so entities are not double-decoded', () => {
    expect(escapeHtmlAttr('&quot;')).toBe('&amp;quot;');
  });

  it('is a no-op for plain text', () => {
    expect(escapeHtmlAttr('plain text 123')).toBe('plain text 123');
  });

  it('handles empty and nullish input', () => {
    expect(escapeHtmlAttr('')).toBe('');
    expect(escapeHtmlAttr(undefined as unknown as string)).toBe('');
  });
});

describe('escapeHtmlText', () => {
  it('escapes angle brackets but keeps quotes readable', () => {
    expect(escapeHtmlText('<b>"x"</b>')).toBe('&lt;b&gt;"x"&lt;/b&gt;');
    expect(escapeHtmlText('a & b')).toBe('a &amp; b');
  });
});

describe('normalizeAttrValue', () => {
  it('flattens newlines and collapses spaces', () => {
    expect(normalizeAttrValue('line one\nline two')).toBe('line one line two');
    expect(normalizeAttrValue('a\t\tb')).toBe('a b');
    expect(normalizeAttrValue('   padded   ')).toBe('padded');
  });

  it('preserves unicode and punctuation used in real copy', () => {
    expect(normalizeAttrValue('— meta lens · 分享预览')).toBe('— meta lens · 分享预览');
  });
});

describe('round trip', () => {
  it('a hostile string cannot escape its attribute', () => {
    const hostile = '"><script>alert(1)</script>';
    const escaped = escapeHtmlAttr(hostile);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('"');
    expect(`<meta content="${escaped}" />`).toBe(
      '<meta content="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;" />',
    );
  });
});
