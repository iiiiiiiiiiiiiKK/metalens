import { emptyDoc, FIELD_BY_KEY, FIELDS } from './fields';
import type { MetaDoc, ParseReport, ParseResult, SourceMode } from './types';
import { cleanText } from './url';

/**
 * Hard cap on the markup we are willing to parse. A pasted document or a
 * fetched page above this size is cut and flagged as truncated instead of
 * freezing the tab.
 */
export const MAX_PARSE_CHARS = 2_000_000;

/** Aliases that resolve to the same logical field. */
const KEY_ALIASES: Record<string, string> = {
  'twitter:image:src': 'twitter:image',
  'twitter:url': 'twitter:url',
  'og:image:url': 'og:image',
  'og:image:secure_url': 'og:image',
  'application-name': 'og:site_name',
};

export interface ParseOptions {
  sourceUrl?: string;
  mode?: SourceMode;
  /** Set when the caller already had to cut the payload. */
  truncated?: boolean;
}

interface MetaCollector {
  values: Map<string, string[]>;
  keys: Set<string>;
}

/** Lower-cases and trims a meta key so `OG:Title ` and `og:title` are equal. */
export function normalizeMetaKey(raw: string): string {
  return cleanText(raw).toLowerCase();
}

/**
 * Parses HTML into the MetaLens document model.
 *
 * SECURITY: the markup is parsed with `DOMParser` into an *inert* document.
 * Scripts are never executed, sub-resources are never fetched, and nothing is
 * ever inserted into the live DOM.
 */
export function parseHtml(html: string, options: ParseOptions = {}): ParseResult {
  const { sourceUrl = '', mode = 'html' } = options;
  const raw = html ?? '';
  const truncated = options.truncated === true || raw.length > MAX_PARSE_CHARS;
  const input = truncated ? raw.slice(0, MAX_PARSE_CHARS) : raw;

  const collector: MetaCollector = { values: new Map(), keys: new Set() };
  const report: ParseReport = {
    mode,
    baseHref: '',
    duplicates: {},
    emptyKeys: [],
    foundKeys: [],
    other: [],
    titleCount: 0,
    truncated,
    parsed: false,
  };

  if (!input.trim()) {
    return { doc: emptyDoc(sourceUrl), report };
  }

  let dom: Document;
  try {
    dom = new DOMParser().parseFromString(input, 'text/html');
  } catch {
    return { doc: emptyDoc(sourceUrl), report };
  }
  report.parsed = true;

  const baseEl = dom.querySelector('base[href]');
  const baseHref = baseEl ? cleanText(baseEl.getAttribute('href') ?? '') : '';
  report.baseHref = baseHref;

  const doc = emptyDoc(sourceUrl);

  // ---- <title> ------------------------------------------------------------
  const titleEls = Array.from(dom.querySelectorAll('title'));
  report.titleCount = titleEls.length;
  const titleValues = titleEls
    .map((el) => cleanText(el.textContent ?? ''))
    .filter((v) => v.length > 0);

  // ---- <meta> -------------------------------------------------------------
  const metaEls = Array.from(dom.querySelectorAll('meta'));
  for (const el of metaEls) {
    const rawKey =
      el.getAttribute('property') ?? el.getAttribute('name') ?? el.getAttribute('itemprop');
    if (rawKey === null) continue;
    const key = normalizeMetaKey(rawKey);
    if (!key) continue;
    const value = cleanText(el.getAttribute('content') ?? '');
    if (!collector.values.has(key)) collector.values.set(key, []);
    collector.values.get(key)!.push(value);
    collector.keys.add(key);
  }

  // ---- <link> -------------------------------------------------------------
  const linkEls = Array.from(dom.querySelectorAll('link'));
  const canonicalValues: string[] = [];
  const iconValues: string[] = [];
  for (const el of linkEls) {
    const rel = normalizeMetaKey(el.getAttribute('rel') ?? '');
    const href = cleanText(el.getAttribute('href') ?? '');
    if (!href) continue;
    const relTokens = rel.split(/\s+/);
    if (relTokens.includes('canonical')) canonicalValues.push(href);
    if (relTokens.includes('icon') || relTokens.includes('apple-touch-icon')) {
      iconValues.push(href);
    }
  }

  // ---- <html lang> --------------------------------------------------------
  const htmlEl = dom.documentElement;
  doc.lang = cleanText(htmlEl?.getAttribute('lang') ?? '') || cleanText(htmlEl?.getAttribute('xml:lang') ?? '');

  report.foundKeys = Array.from(collector.keys).sort();

  const resolvedValues = new Map<string, string[]>();
  for (const [key, values] of collector.values) {
    const target = KEY_ALIASES[key] ?? key;
    if (!resolvedValues.has(target)) resolvedValues.set(target, []);
    resolvedValues.get(target)!.push(...values);
  }

  /** First non-empty value for a meta key, '' when absent or blank. */
  const pick = (key: string): string => {
    const values = resolvedValues.get(key);
    if (!values) return '';
    return values.find((v) => v.length > 0) ?? '';
  };

  doc.title = titleValues[0] ?? '';
  doc.description = pick('description');
  doc.canonical = canonicalValues.find((v) => v.length > 0) ?? '';
  doc.favicon = iconValues[0] ?? '';
  doc.robots = pick('robots');
  doc.viewport = pick('viewport');

  // ---- mapped fields ------------------------------------------------------
  for (const field of FIELDS) {
    if (['title', 'description', 'canonical', 'favicon', 'robots', 'viewport', 'lang'].includes(field.key)) {
      continue;
    }
    const canonicalKey = field.key;
    const value = pick(canonicalKey);
    if (!value) continue;
    setPath(doc, field.path, value);
  }

  // ---- diagnostics --------------------------------------------------------
  for (const [key, values] of resolvedValues) {
    if (values.length > 1) report.duplicates[key] = [...values];
    if (values.some((v) => v.length === 0)) report.emptyKeys.push(key);
  }
  if (titleEls.length > 1) {
    report.duplicates['title'] = titleEls.map((el) => cleanText(el.textContent ?? ''));
  }

  for (const key of report.foundKeys) {
    if (FIELD_BY_KEY[key]) continue;
    if (KEY_ALIASES[key] && FIELD_BY_KEY[KEY_ALIASES[key]]) continue;
    report.other.push({ key, value: pick(key) });
  }

  return { doc, report };
}

function setPath(doc: MetaDoc, path: string, value: string): void {
  const parts = path.split('.');
  if (parts.length === 1) {
    (doc as unknown as Record<string, string>)[parts[0]] = value;
    return;
  }
  const container = (doc as unknown as Record<string, Record<string, string>>)[parts[0]];
  if (container) container[parts[1]] = value;
}

/** Extracts a best-effort page URL from raw HTML (`<link rel=canonical>`/`og:url`). */
export function guessPageUrl(result: ParseResult): string {
  return result.doc.canonical || result.doc.og.url || result.doc.sourceUrl || '';
}
