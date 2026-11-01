import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../../src/lib/fields';
import { buildPreview, defaultVariant } from '../../src/lib/preview';

function doc(overrides: (d: ReturnType<typeof emptyDoc>) => void = () => {}) {
  const d = emptyDoc('https://example.com/page');
  overrides(d);
  return d;
}

describe('buildPreview fallback chains', () => {
  it('X prefers twitter:*, then og:*, then the classic tags', () => {
    const d = doc((x) => {
      x.title = 'Plain title';
      x.og.title = 'OG title';
      x.twitter.title = 'Twitter title';
    });
    expect(buildPreview(d, 'x').title).toBe('Twitter title');
    expect(buildPreview(d, 'x').sources.title).toBe('twitter:title');

    delete (d.twitter as Partial<typeof d.twitter>).title;
    expect(buildPreview(d, 'x').title).toBe('OG title');

    delete (d.og as Partial<typeof d.og>).title;
    expect(buildPreview(d, 'x').title).toBe('Plain title');
  });

  it('Facebook and LinkedIn prefer og:*', () => {
    const d = doc((x) => {
      x.title = 'Plain title';
      x.og.title = 'OG title';
      x.twitter.title = 'Twitter title';
    });
    expect(buildPreview(d, 'facebook').title).toBe('OG title');
    expect(buildPreview(d, 'linkedin').title).toBe('OG title');
  });

  it('WeChat prefers the classic <title>', () => {
    const d = doc((x) => {
      x.title = 'Plain title';
      x.og.title = 'OG title';
    });
    expect(buildPreview(d, 'wechat').title).toBe('Plain title');
  });

  it('falls back gracefully when nothing is set', () => {
    const preview = buildPreview(doc(), 'x');
    expect(preview.title).toBe('');
    expect(preview.imageUrl).toBe('');
    expect(preview.variant).toBe('none');
  });
});

describe('variant selection', () => {
  it('derives the X card style from twitter:card', () => {
    const d = doc((x) => {
      x.twitter.card = 'summary';
      x.twitter.image = 'https://example.com/a.png';
    });
    expect(defaultVariant(d, 'x')).toBe('small');
    d.twitter.card = 'summary_large_image';
    expect(defaultVariant(d, 'x')).toBe('large');
  });

  it('uses the large card on other platforms when an image exists', () => {
    const d = doc((x) => {
      x.og.image = 'https://example.com/a.png';
    });
    expect(defaultVariant(d, 'facebook')).toBe('large');
    expect(defaultVariant(d, 'linkedin')).toBe('large');
  });

  it('returns no card image when there is no image at all', () => {
    const d = doc((x) => {
      x.twitter.card = 'summary_large_image';
    });
    expect(buildPreview(d, 'x').variant).toBe('none');
  });

  it('honours an explicit override', () => {
    const d = doc((x) => {
      x.og.image = 'https://example.com/a.png';
    });
    expect(buildPreview(d, 'facebook', 'small').variant).toBe('small');
    expect(buildPreview(d, 'facebook', 'none').imageUrl).toBe('');
  });
});

describe('domain and URLs', () => {
  it('uses canonical first, then og:url, then the source URL', () => {
    const d = doc((x) => {
      x.canonical = 'https://www.example.com/canonical';
      x.og.url = 'https://og.example.com/og';
    });
    expect(buildPreview(d, 'x').domain).toBe('example.com');

    delete (d as Partial<typeof d>).canonical;
    expect(buildPreview(d, 'x').domain).toBe('og.example.com');

    delete (d.og as Partial<typeof d.og>).url;
    expect(buildPreview(d, 'x').domain).toBe('example.com');
  });

  it('resolves relative image and favicon paths', () => {
    const d = doc((x) => {
      x.og.image = '/images/cover.png';
      x.favicon = '/favicon.svg';
    });
    const preview = buildPreview(d, 'facebook');
    expect(preview.imageUrl).toBe('https://example.com/images/cover.png');
    expect(preview.faviconUrl).toBe('https://example.com/favicon.svg');
  });

  it('reports the card type', () => {
    const d = doc((x) => {
      x.twitter.card = 'summary_large_image';
    });
    expect(buildPreview(d, 'x').cardType).toBe('summary_large_image');
    expect(buildPreview(d, 'facebook').cardType).toBe('opengraph');
  });
});
