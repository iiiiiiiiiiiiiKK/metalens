import type { CardVariant, MetaDoc, Platform, PreviewData } from './types';
import { displayDomain, resolveUrl } from './url';

export const PLATFORMS: Platform[] = ['x', 'facebook', 'linkedin', 'wechat'];

function firstNonEmpty(...values: string[]): { value: string; index: number } {
  for (let i = 0; i < values.length; i += 1) {
    const v = (values[i] ?? '').trim();
    if (v) return { value: v, index: i };
  }
  return { value: '', index: -1 };
}

/** The variant a platform would render, before any manual override. */
export function defaultVariant(doc: MetaDoc, platform: Platform): CardVariant {
  if (platform === 'x') {
    const card = doc.twitter.card.trim().toLowerCase();
    const hasImage = Boolean(doc.twitter.image.trim() || doc.og.image.trim());
    if (card === 'summary') return hasImage ? 'small' : 'none';
    if (card === 'summary_large_image') return hasImage ? 'large' : 'none';
    return hasImage ? 'large' : 'none';
  }
  const hasImage = Boolean(doc.og.image.trim() || doc.twitter.image.trim());
  return hasImage ? 'large' : 'none';
}

/**
 * Builds the data a share card needs, applying the documented fallback chain
 * for each platform. This is a *simulation* built from meta tags — it does not
 * reproduce a platform's ranking, caching or truncation behaviour.
 */
export function buildPreview(
  doc: MetaDoc,
  platform: Platform,
  variantOverride?: CardVariant,
): PreviewData {
  const pageUrl = (doc.canonical || doc.og.url || doc.sourceUrl || '').trim();
  const domain = displayDomain(pageUrl);

  let titleParts: string[];
  let descParts: string[];
  let imageParts: string[];

  switch (platform) {
    case 'x':
      titleParts = [doc.twitter.title, doc.og.title, doc.title];
      descParts = [doc.twitter.description, doc.og.description, doc.description];
      imageParts = [doc.twitter.image, doc.og.image];
      break;
    case 'facebook':
      titleParts = [doc.og.title, doc.title, doc.twitter.title];
      descParts = [doc.og.description, doc.description, doc.twitter.description];
      imageParts = [doc.og.image, doc.twitter.image];
      break;
    case 'linkedin':
      titleParts = [doc.og.title, doc.title, doc.twitter.title];
      descParts = [doc.og.description, doc.description, doc.twitter.description];
      imageParts = [doc.og.image, doc.twitter.image];
      break;
    case 'wechat':
    default:
      titleParts = [doc.title, doc.og.title, doc.twitter.title];
      descParts = [doc.og.description, doc.description, doc.twitter.description];
      imageParts = [doc.og.image, doc.twitter.image];
      break;
  }

  const title = firstNonEmpty(...titleParts);
  const description = firstNonEmpty(...descParts);
  const image = firstNonEmpty(...imageParts);

  const variant = variantOverride ?? defaultVariant(doc, platform);
  const imageUrl = variant === 'none' ? '' : resolveUrl(image.value, doc.sourceUrl);

  const cardType =
    platform === 'x'
      ? (
          doc.twitter.card.trim() || (image.value ? 'summary_large_image' : 'summary')
        ).toLowerCase()
      : 'opengraph';

  return {
    platform,
    variant,
    title: title.value,
    description: description.value,
    domain,
    imageUrl,
    faviconUrl: resolveUrl(doc.favicon, doc.sourceUrl),
    pageUrl,
    cardType,
    sources: {
      title: sourceName(platform, 'title', title.index),
      description: sourceName(platform, 'description', description.index),
      image: sourceName(platform, 'image', image.index),
    },
  };
}

function sourceName(
  platform: Platform,
  kind: 'title' | 'description' | 'image',
  index: number,
): string {
  if (index < 0) return '';
  const chains: Record<Platform, Record<string, string[]>> = {
    x: {
      title: ['twitter:title', 'og:title', 'title'],
      description: ['twitter:description', 'og:description', 'description'],
      image: ['twitter:image', 'og:image'],
    },
    facebook: {
      title: ['og:title', 'title', 'twitter:title'],
      description: ['og:description', 'description', 'twitter:description'],
      image: ['og:image', 'twitter:image'],
    },
    linkedin: {
      title: ['og:title', 'title', 'twitter:title'],
      description: ['og:description', 'description', 'twitter:description'],
      image: ['og:image', 'twitter:image'],
    },
    wechat: {
      title: ['title', 'og:title', 'twitter:title'],
      description: ['og:description', 'description', 'twitter:description'],
      image: ['og:image', 'twitter:image'],
    },
  };
  return chains[platform][kind][index] ?? '';
}
