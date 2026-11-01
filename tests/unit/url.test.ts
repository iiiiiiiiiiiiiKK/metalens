import { describe, expect, it } from 'vitest';
import {
  charLength,
  cleanText,
  displayDomain,
  isAbsoluteHttpUrl,
  normalizeUrlInput,
  resolveUrl,
  sameUrl,
} from '../../src/lib/url';

describe('isAbsoluteHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isAbsoluteHttpUrl('http://example.com')).toBe(true);
    expect(isAbsoluteHttpUrl('https://example.com/a?b=1#c')).toBe(true);
    expect(isAbsoluteHttpUrl('  https://example.com  ')).toBe(true);
  });

  it('rejects everything else', () => {
    for (const value of [
      '',
      '/relative',
      'images/cover.png',
      'javascript:alert(1)',
      'data:image/png;base64,AAA',
      'file:///etc/passwd',
      'ftp://example.com/a',
      'https://',
    ]) {
      expect(isAbsoluteHttpUrl(value), value).toBe(false);
    }
  });
});

describe('normalizeUrlInput', () => {
  it('adds a scheme when it is missing', () => {
    expect(normalizeUrlInput('example.com')).toBe('https://example.com/');
    expect(normalizeUrlInput('  example.com/blog/post  ')).toBe(
      'https://example.com/blog/post',
    );
  });

  it('keeps an explicit scheme', () => {
    expect(normalizeUrlInput('http://example.com/x')).toBe('http://example.com/x');
  });

  it('rejects dangerous or unsupported schemes', () => {
    expect(normalizeUrlInput('javascript:alert(document.domain)')).toBeNull();
    expect(normalizeUrlInput('data:text/html,<h1>x</h1>')).toBeNull();
    expect(normalizeUrlInput('file:///C:/Windows')).toBeNull();
    expect(normalizeUrlInput('')).toBeNull();
  });
});

describe('resolveUrl', () => {
  it('resolves relative paths against the source URL', () => {
    expect(resolveUrl('/images/a.png', 'https://example.com/blog/post')).toBe(
      'https://example.com/images/a.png',
    );
    expect(resolveUrl('images/a.png', 'https://example.com/blog/post')).toBe(
      'https://example.com/blog/images/a.png',
    );
  });

  it('resolves protocol-relative URLs using the source scheme', () => {
    expect(resolveUrl('//cdn.example.com/a.png', 'http://example.com/x')).toBe(
      'http://cdn.example.com/a.png',
    );
    expect(resolveUrl('//cdn.example.com/a.png', '')).toBe('https://cdn.example.com/a.png');
  });

  it('returns absolute URLs untouched', () => {
    expect(resolveUrl('https://cdn.example.com/a.png', 'https://example.com')).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('returns an empty string when it cannot resolve', () => {
    expect(resolveUrl('images/a.png', '')).toBe('');
    expect(resolveUrl('javascript:alert(1)', 'https://example.com')).toBe('');
    expect(resolveUrl('', 'https://example.com')).toBe('');
  });
});

describe('displayDomain', () => {
  it('drops the www prefix', () => {
    expect(displayDomain('https://www.example.com/a')).toBe('example.com');
    expect(displayDomain('https://blog.example.co.uk/a')).toBe('blog.example.co.uk');
    expect(displayDomain('not a url')).toBe('');
  });
});

describe('sameUrl', () => {
  it('ignores a trailing slash, fragment and host casing', () => {
    expect(sameUrl('https://example.com/a/', 'https://example.com/a')).toBe(true);
    expect(sameUrl('https://EXAMPLE.com/a#top', 'https://example.com/a')).toBe(true);
    expect(sameUrl('https://example.com/a?x=1', 'https://example.com/a')).toBe(false);
  });

  it('is false for unusable input', () => {
    expect(sameUrl('', 'https://example.com')).toBe(false);
    expect(sameUrl('/relative', '/relative')).toBe(false);
  });
});

describe('text helpers', () => {
  it('collapses whitespace and control characters', () => {
    expect(cleanText('  a \n\t b  ')).toBe('a b');
    expect(cleanText('a\u0000b')).toBe('a b');
  });

  it('counts code points, not UTF-16 units', () => {
    expect(charLength('hello')).toBe(5);
    expect(charLength('👍👍')).toBe(2);
    expect(charLength('中文')).toBe(2);
  });
});
