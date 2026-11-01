import { escapeHtmlAttr, escapeHtmlText, normalizeAttrValue } from './escape';
import { FIELD_BY_KEY, getByPath } from './fields';
import type { MetaDoc } from './types';

export interface CodegenOptions {
  includeTitle: boolean;
  includeDescription: boolean;
  includeCanonical: boolean;
  includeRobots: boolean;
  includeViewport: boolean;
  includeTwitter: boolean;
  includeOg: boolean;
}

export const DEFAULT_CODEGEN_OPTIONS: CodegenOptions = {
  includeTitle: true,
  includeDescription: true,
  includeCanonical: true,
  includeRobots: false,
  includeViewport: false,
  includeTwitter: true,
  includeOg: true,
};

/** Order matters: scrapers that stop at the first match should see OG first. */
const META_ORDER = [
  'description',
  'robots',
  'viewport',
  'og:title',
  'og:description',
  'og:image',
  'og:image:alt',
  'og:url',
  'og:type',
  'og:site_name',
  'og:locale',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
  'twitter:site',
  'twitter:creator',
];

/** Which switch (if any) controls a given meta key. */
function isEnabled(key: string, opts: CodegenOptions): boolean {
  if (key.startsWith('og:')) return opts.includeOg;
  if (key.startsWith('twitter:')) return opts.includeTwitter;
  switch (key) {
    case 'description':
      return opts.includeDescription;
    case 'robots':
      return opts.includeRobots;
    case 'viewport':
      return opts.includeViewport;
    default:
      return true;
  }
}

function metaAttribute(key: string): 'property' | 'name' {
  if (key === 'description' || key === 'robots' || key === 'viewport') return 'name';
  if (key.startsWith('twitter:')) return 'name';
  return 'property';
}

/** Renders a single `<meta>` tag, or '' when the value is empty. */
export function generateTag(key: string, value: string): string {
  const clean = normalizeAttrValue(value);
  if (!clean) return '';
  const attr = metaAttribute(key);
  return `<meta ${attr}="${escapeHtmlAttr(key)}" content="${escapeHtmlAttr(clean)}" />`;
}

export interface GeneratedTag {
  key: string;
  value: string;
  tag: string;
}

/** Every tag that would be emitted, individually, for per-tag copy buttons. */
export function generateTagList(
  doc: MetaDoc,
  opts: CodegenOptions = DEFAULT_CODEGEN_OPTIONS,
): GeneratedTag[] {
  const out: GeneratedTag[] = [];
  for (const key of META_ORDER) {
    const field = FIELD_BY_KEY[key];
    if (!field) continue;
    if (!isEnabled(key, opts)) continue;
    const value = getByPath(doc, field.path);
    const tag = generateTag(key, value);
    if (tag) out.push({ key, value, tag });
  }
  return out;
}

/**
 * Full markup snippet. Values are escaped, blank fields are skipped, and the
 * output is stable so it diffs cleanly in a code review.
 */
export function generateMetaTags(
  doc: MetaDoc,
  opts: CodegenOptions = DEFAULT_CODEGEN_OPTIONS,
): string {
  const lines: string[] = [];
  const title = normalizeAttrValue(doc.title);
  if (opts.includeTitle && title) lines.push(`<title>${escapeHtmlText(title)}</title>`);

  const canonical = normalizeAttrValue(doc.canonical);
  if (opts.includeCanonical && canonical) {
    lines.push(`<link rel="canonical" href="${escapeHtmlAttr(canonical)}" />`);
  }

  for (const item of generateTagList(doc, opts)) lines.push(item.tag);

  if (doc.lang.trim()) {
    lines.push('');
    lines.push(
      `<!-- also set on the <html> element: lang="${escapeHtmlAttr(normalizeAttrValue(doc.lang))}" -->`,
    );
  }

  return lines.join('\n');
}
