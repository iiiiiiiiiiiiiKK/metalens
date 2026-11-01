/** Where the currently inspected document came from. */
export type SourceMode = 'url' | 'html' | 'sample' | 'manual';

/** Result status of a single check. */
export type Status = 'ok' | 'missing' | 'warning' | 'unverified';

/** Check groups shown in the left navigation. */
export type Group = 'basic' | 'og' | 'twitter' | 'image';

/** Simulated share targets. */
export type Platform = 'x' | 'facebook' | 'linkedin' | 'wechat';

/** Card shapes a platform can render. */
export type CardVariant = 'large' | 'small' | 'none';

export type Locale = 'en' | 'zh';

export type Theme = 'dark' | 'light';

export interface OpenGraphData {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  url: string;
  type: string;
  siteName: string;
  locale: string;
}

export interface TwitterData {
  card: string;
  title: string;
  description: string;
  image: string;
  site: string;
  creator: string;
}

/** The editable model of every meta value MetaLens understands. */
export interface MetaDoc {
  /** Absolute URL of the page these tags belong to (used to resolve relative paths). */
  sourceUrl: string;
  title: string;
  description: string;
  canonical: string;
  lang: string;
  robots: string;
  viewport: string;
  favicon: string;
  og: OpenGraphData;
  twitter: TwitterData;
}

/**
 * Diagnostics collected while parsing raw HTML. These describe the *source*
 * markup (duplicates, blank attributes, unknown tags) and are not editable.
 */
export interface ParseReport {
  mode: SourceMode;
  baseHref: string;
  /** Raw key -> every value found, only when the key appeared more than once. */
  duplicates: Record<string, string[]>;
  /** Keys that were present but with an empty / whitespace-only value. */
  emptyKeys: string[];
  /** Every meta key found in the document (normalised, lowercase). */
  foundKeys: string[];
  /** Meta tags MetaLens does not model, kept for transparency. */
  other: Array<{ key: string; value: string }>;
  /** Number of `<title>` elements found. */
  titleCount: number;
  /** True when the HTML was cut at the transfer size limit. */
  truncated: boolean;
  /** True when an HTML document was actually parsed. */
  parsed: boolean;
}

export interface ParseResult {
  doc: MetaDoc;
  report: ParseReport;
}

export interface Finding {
  /** Stable id: `${code}:${field}`. */
  id: string;
  /** i18n message key describing the problem. */
  code: string;
  group: Group;
  /** Field name shown to the user, e.g. `og:image`. */
  field: string;
  /** Path used by the editor to focus the field (e.g. `og.image`). */
  path: string;
  value: string;
  status: Status;
  /** Contribution to the health score. Published in the app and the README. */
  weight: number;
  params?: Record<string, string | number>;
}

export interface ImageProbe {
  url: string;
  /** `idle` means the probe was not run (no URL, or blocked by the user). */
  status: 'idle' | 'loading' | 'ok' | 'error' | 'timeout';
  width?: number;
  height?: number;
  error?: string;
}

export interface PreviewData {
  platform: Platform;
  variant: CardVariant;
  title: string;
  description: string;
  domain: string;
  imageUrl: string;
  faviconUrl: string;
  pageUrl: string;
  cardType: string;
  /** Which sources each value came from, so the UI can explain fallbacks. */
  sources: {
    title: string;
    description: string;
    image: string;
  };
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  mode: SourceMode;
  checkedAt: number;
  score: number;
  status: 'ok' | 'warn' | 'error';
}

export interface HealthGroupScore {
  group: Group;
  earned: number;
  possible: number;
}

export interface HealthResult {
  score: number;
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  groups: HealthGroupScore[];
  counts: Record<Status, number>;
  total: number;
}
