import type { Group, MetaDoc } from './types';

/**
 * The single source of truth for "which meta fields does MetaLens model".
 *
 * `key`      canonical name as it is written in HTML
 * `path`     dot path inside `MetaDoc`
 * `fallback` which field a platform will use when this one is absent
 */
export interface FieldDef {
  key: string;
  path: string;
  group: Group;
  editable: boolean;
  multi: boolean;
  /** Health-score weight; published in the app and the README. */
  weight: number;
  fallback?: string;
}

export const FIELDS: FieldDef[] = [
  { key: 'title', path: 'title', group: 'basic', editable: true, multi: false, weight: 3 },
  {
    key: 'description',
    path: 'description',
    group: 'basic',
    editable: true,
    multi: false,
    weight: 3,
  },
  {
    key: 'canonical',
    path: 'canonical',
    group: 'basic',
    editable: true,
    multi: false,
    weight: 2,
  },
  { key: 'lang', path: 'lang', group: 'basic', editable: true, multi: false, weight: 1 },
  { key: 'robots', path: 'robots', group: 'basic', editable: false, multi: false, weight: 1 },
  {
    key: 'viewport',
    path: 'viewport',
    group: 'basic',
    editable: false,
    multi: false,
    weight: 2,
  },
  { key: 'favicon', path: 'favicon', group: 'basic', editable: false, multi: true, weight: 2 },

  {
    key: 'og:title',
    path: 'og.title',
    group: 'og',
    editable: true,
    multi: false,
    weight: 3,
    fallback: 'title',
  },
  {
    key: 'og:description',
    path: 'og.description',
    group: 'og',
    editable: true,
    multi: false,
    weight: 3,
    fallback: 'description',
  },
  {
    key: 'og:image',
    path: 'og.image',
    group: 'og',
    editable: true,
    multi: true,
    weight: 3,
  },
  {
    key: 'og:image:alt',
    path: 'og.imageAlt',
    group: 'og',
    editable: true,
    multi: false,
    weight: 1,
  },
  {
    key: 'og:url',
    path: 'og.url',
    group: 'og',
    editable: true,
    multi: false,
    weight: 2,
    fallback: 'canonical',
  },
  { key: 'og:type', path: 'og.type', group: 'og', editable: true, multi: false, weight: 2 },
  {
    key: 'og:site_name',
    path: 'og.siteName',
    group: 'og',
    editable: true,
    multi: false,
    weight: 1,
  },
  {
    key: 'og:locale',
    path: 'og.locale',
    group: 'og',
    editable: true,
    multi: false,
    weight: 1,
  },

  {
    key: 'twitter:card',
    path: 'twitter.card',
    group: 'twitter',
    editable: true,
    multi: false,
    weight: 3,
  },
  {
    key: 'twitter:title',
    path: 'twitter.title',
    group: 'twitter',
    editable: true,
    multi: false,
    weight: 2,
    fallback: 'og:title',
  },
  {
    key: 'twitter:description',
    path: 'twitter.description',
    group: 'twitter',
    editable: true,
    multi: false,
    weight: 2,
    fallback: 'og:description',
  },
  {
    key: 'twitter:image',
    path: 'twitter.image',
    group: 'twitter',
    editable: true,
    multi: true,
    weight: 3,
    fallback: 'og:image',
  },
  {
    key: 'twitter:site',
    path: 'twitter.site',
    group: 'twitter',
    editable: true,
    multi: false,
    weight: 1,
  },
  {
    key: 'twitter:creator',
    path: 'twitter.creator',
    group: 'twitter',
    editable: true,
    multi: false,
    weight: 1,
  },
];

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f]),
);

export const FIELDS_BY_GROUP: Record<Group, FieldDef[]> = {
  basic: FIELDS.filter((f) => f.group === 'basic'),
  og: FIELDS.filter((f) => f.group === 'og'),
  twitter: FIELDS.filter((f) => f.group === 'twitter'),
  image: [],
};

export const GROUPS: Group[] = ['basic', 'og', 'twitter', 'image'];

export const ALLOWED_TWITTER_CARDS = [
  'summary',
  'summary_large_image',
  'app',
  'player',
] as const;

/** Ordered list of the two image fields that get probed. */
export const IMAGE_FIELDS = ['og:image', 'twitter:image'] as const;

/** Reads a dot path out of the document model. */
export function getByPath(doc: MetaDoc, path: string): string {
  const parts = path.split('.');
  let node: unknown = doc;
  for (const part of parts) {
    if (node === null || typeof node !== 'object') return '';
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : '';
}

/** Returns a new document with the dot path replaced (immutably). */
export function setByPath(doc: MetaDoc, path: string, value: string): MetaDoc {
  const parts = path.split('.');
  const clone = structuredCloneSafe(doc);
  let node: Record<string, unknown> = clone as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const next = node[parts[i]];
    if (next === null || typeof next !== 'object') return doc;
    node = next as Record<string, unknown>;
  }
  node[parts[parts.length - 1]] = value;
  return clone;
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function emptyDoc(sourceUrl = ''): MetaDoc {
  return {
    sourceUrl,
    title: '',
    description: '',
    canonical: '',
    lang: '',
    robots: '',
    viewport: '',
    favicon: '',
    og: {
      title: '',
      description: '',
      image: '',
      imageAlt: '',
      url: '',
      type: '',
      siteName: '',
      locale: '',
    },
    twitter: {
      card: '',
      title: '',
      description: '',
      image: '',
      site: '',
      creator: '',
    },
  };
}

/** True when the document has no user-visible values at all. */
export function isDocEmpty(doc: MetaDoc): boolean {
  return FIELDS.every((f) => getByPath(doc, f.path).trim() === '');
}
