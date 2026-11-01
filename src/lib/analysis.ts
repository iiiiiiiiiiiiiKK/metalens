import { ALLOWED_TWITTER_CARDS, FIELD_BY_KEY, getByPath } from './fields';
import type { Finding, ImageProbe, MetaDoc, ParseReport, Status } from './types';
import { charLength, isAbsoluteHttpUrl, resolveUrl, sameUrl } from './url';

/**
 * Length hints. These are *advisory*: every platform truncates differently and
 * changes its rules without notice, so MetaLens never presents them as
 * hard requirements — only as "this may be cut off".
 */
export const LENGTH_HINTS = {
  title: { min: 15, max: 60, hardMax: 70 },
  description: { min: 50, max: 160, hardMax: 200 },
} as const;

export const OG_FIELDS = [
  'og:title',
  'og:description',
  'og:image',
  'og:image:alt',
  'og:url',
  'og:type',
  'og:site_name',
  'og:locale',
] as const;

export const TWITTER_FIELDS = [
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
  'twitter:site',
  'twitter:creator',
] as const;

export const BASIC_FIELDS = [
  'title',
  'description',
  'canonical',
  'lang',
  'robots',
  'viewport',
  'favicon',
] as const;

interface AddArgs {
  code: string;
  group: Finding['group'];
  key: string;
  value: string;
  status: Status;
  weight?: number;
  params?: Record<string, string | number>;
}

function makeFinding(args: AddArgs): Finding {
  const field = FIELD_BY_KEY[args.key];
  return {
    id: `${args.code}:${args.key}:${args.group}`,
    code: args.code,
    group: args.group,
    field: args.key,
    path: field?.path ?? args.key,
    value: args.value,
    status: args.status,
    weight: args.weight ?? field?.weight ?? 1,
    ...(args.params ? { params: args.params } : {}),
  };
}

/**
 * Runs every check and returns a flat, ordered list of findings.
 * Nothing here is random: same input always produces the same output.
 */
export function analyze(
  doc: MetaDoc,
  report: ParseReport,
  probes: ImageProbe[] = [],
): Finding[] {
  const out: Finding[] = [];
  const push = (args: AddArgs) => out.push(makeFinding(args));
  const dupes = report.duplicates;
  const empties = new Set(report.emptyKeys);
  const dupParams = (key: string): Record<string, string | number> | undefined => {
    const values = dupes[key];
    if (!values) return undefined;
    return { count: values.length, values: values.filter(Boolean).join(' | ') };
  };

  // ---------------------------------------------------------------- title --
  {
    const value = doc.title.trim();
    const len = charLength(value);
    if (!value) {
      push({
        code: empties.has('title') ? 'title.empty' : 'title.missing',
        group: 'basic',
        key: 'title',
        value,
        status: 'missing',
      });
    } else if (len < LENGTH_HINTS.title.min) {
      push({
        code: 'title.short',
        group: 'basic',
        key: 'title',
        value,
        status: 'warning',
        params: { len, min: LENGTH_HINTS.title.min },
      });
    } else if (len > LENGTH_HINTS.title.max) {
      push({
        code: 'title.long',
        group: 'basic',
        key: 'title',
        value,
        status: 'warning',
        params: { len, max: LENGTH_HINTS.title.max, hardMax: LENGTH_HINTS.title.hardMax },
      });
    } else {
      push({ code: 'title.ok', group: 'basic', key: 'title', value, status: 'ok', params: { len } });
    }
    const p = dupParams('title');
    if (p) {
      push({
        code: 'title.duplicate',
        group: 'basic',
        key: 'title',
        value,
        status: 'warning',
        params: p,
        weight: 1,
      });
    }
  }

  // ---------------------------------------------------------- description --
  {
    const value = doc.description.trim();
    const len = charLength(value);
    if (!value) {
      push({
        code: empties.has('description') ? 'description.empty' : 'description.missing',
        group: 'basic',
        key: 'description',
        value,
        status: 'missing',
      });
    } else if (len < LENGTH_HINTS.description.min) {
      push({
        code: 'description.short',
        group: 'basic',
        key: 'description',
        value,
        status: 'warning',
        params: { len, min: LENGTH_HINTS.description.min },
      });
    } else if (len > LENGTH_HINTS.description.max) {
      push({
        code: 'description.long',
        group: 'basic',
        key: 'description',
        value,
        status: 'warning',
        params: { len, max: LENGTH_HINTS.description.max, hardMax: LENGTH_HINTS.description.hardMax },
      });
    } else {
      push({
        code: 'description.ok',
        group: 'basic',
        key: 'description',
        value,
        status: 'ok',
        params: { len },
      });
    }
    const p = dupParams('description');
    if (p) {
      push({
        code: 'description.duplicate',
        group: 'basic',
        key: 'description',
        value,
        status: 'warning',
        params: p,
        weight: 1,
      });
    }
  }

  // ------------------------------------------------------------- canonical --
  {
    const value = doc.canonical.trim();
    if (!value) {
      push({
        code: 'canonical.missing',
        group: 'basic',
        key: 'canonical',
        value,
        status: 'warning',
      });
    } else if (!isAbsoluteHttpUrl(value)) {
      const resolved = resolveUrl(value, doc.sourceUrl);
      push({
        code: resolved ? 'canonical.relative' : 'canonical.invalid',
        group: 'basic',
        key: 'canonical',
        value,
        status: 'warning',
        params: { resolved },
      });
    } else if (doc.sourceUrl && !sameUrl(value, doc.sourceUrl)) {
      push({
        code: 'canonical.mismatch',
        group: 'basic',
        key: 'canonical',
        value,
        status: 'warning',
        params: { canonical: value, current: doc.sourceUrl },
      });
    } else {
      push({ code: 'canonical.ok', group: 'basic', key: 'canonical', value, status: 'ok' });
    }
    const p = dupParams('canonical');
    if (p) {
      push({
        code: 'canonical.duplicate',
        group: 'basic',
        key: 'canonical',
        value,
        status: 'warning',
        params: p,
        weight: 1,
      });
    }
  }

  // ------------------------------------------------------------------ lang --
  {
    const value = doc.lang.trim();
    if (!value) {
      push({ code: 'lang.missing', group: 'basic', key: 'lang', value, status: 'warning' });
    } else {
      push({ code: 'lang.ok', group: 'basic', key: 'lang', value, status: 'ok' });
    }
  }

  // ---------------------------------------------------------------- robots --
  {
    const value = doc.robots.trim().toLowerCase();
    if (/(^|[\s,])noindex([\s,]|$)/.test(value) || value === 'none') {
      push({
        code: 'robots.noindex',
        group: 'basic',
        key: 'robots',
        value,
        status: 'warning',
      });
    } else {
      push({ code: 'robots.ok', group: 'basic', key: 'robots', value, status: 'ok' });
    }
  }

  // -------------------------------------------------------------- viewport --
  {
    const value = doc.viewport.trim();
    if (!value) {
      push({ code: 'viewport.missing', group: 'basic', key: 'viewport', value, status: 'warning' });
    } else if (!/width\s*=\s*device-width/i.test(value)) {
      push({ code: 'viewport.invalid', group: 'basic', key: 'viewport', value, status: 'warning' });
    } else {
      push({ code: 'viewport.ok', group: 'basic', key: 'viewport', value, status: 'ok' });
    }
  }

  // --------------------------------------------------------------- favicon --
  {
    const value = doc.favicon.trim();
    if (!value) {
      push({ code: 'favicon.missing', group: 'basic', key: 'favicon', value, status: 'warning' });
    } else if (!isAbsoluteHttpUrl(value)) {
      const resolved = resolveUrl(value, doc.sourceUrl);
      push({
        code: resolved ? 'favicon.relative' : 'favicon.invalid',
        group: 'basic',
        key: 'favicon',
        value,
        status: 'warning',
        params: { resolved },
      });
    } else {
      push({ code: 'favicon.ok', group: 'basic', key: 'favicon', value, status: 'ok' });
    }
  }

  // ---------------------------------------------------------- Open Graph ---
  for (const key of OG_FIELDS) {
    const field = FIELD_BY_KEY[key];
    const value = getByPath(doc, field.path).trim();
    const fallbackKey = field.fallback;
    const fallbackValue = fallbackKey ? getByPath(doc, fallbackKey).trim() : '';

    if (!value) {
      push({
        code: empties.has(key) ? 'og.empty' : 'og.missing',
        group: 'og',
        key,
        value,
        status: 'warning',
        params: { field: key, fallback: fallbackKey ?? '' },
      });
    } else if (key === 'og:image' && !isAbsoluteHttpUrl(value)) {
      const resolved = resolveUrl(value, doc.sourceUrl);
      push({
        code: 'og.image.relative',
        group: 'og',
        key,
        value,
        status: 'warning',
        params: { field: key, resolved },
      });
    } else if (key === 'og:url' && doc.canonical && !sameUrl(value, doc.canonical)) {
      push({
        code: 'og.url.mismatch',
        group: 'og',
        key,
        value,
        status: 'warning',
        params: { ogUrl: value, canonical: doc.canonical },
      });
    } else {
      push({
        code: 'og.ok',
        group: 'og',
        key,
        value,
        status: 'ok',
        params: { field: key },
      });
    }

    if (!value && fallbackValue) {
      push({
        code: 'og.fallback',
        group: 'og',
        key,
        value,
        status: 'ok',
        weight: 0,
        params: { field: key, fallback: fallbackKey ?? '' },
      });
    }

    const p = dupParams(key);
    if (p) {
      push({
        code: 'og.duplicate',
        group: 'og',
        key,
        value,
        status: 'warning',
        params: { field: key, ...p },
        weight: 1,
      });
    }
  }

  // --------------------------------------------------- Twitter / X Cards ---
  for (const key of TWITTER_FIELDS) {
    const field = FIELD_BY_KEY[key];
    const value = getByPath(doc, field.path).trim();
    const fallbackKey = field.fallback;
    const fallbackValue = fallbackKey ? getByPath(doc, fallbackKey).trim() : '';

    if (key === 'twitter:card' && value) {
      if (!(ALLOWED_TWITTER_CARDS as readonly string[]).includes(value.toLowerCase())) {
        push({
          code: 'twitter.card.invalid',
          group: 'twitter',
          key,
          value,
          status: 'warning',
          params: { value, allowed: ALLOWED_TWITTER_CARDS.join(', ') },
        });
      } else {
        push({ code: 'twitter.ok', group: 'twitter', key, value, status: 'ok', params: { field: key } });
      }
      continue;
    }

    if (!value) {
      const hasFallback = Boolean(fallbackValue);
      push({
        code: hasFallback ? 'twitter.fallback' : empties.has(key) ? 'twitter.empty' : 'twitter.missing',
        group: 'twitter',
        key,
        value,
        status: hasFallback && key !== 'twitter:card' ? 'ok' : 'warning',
        weight: hasFallback && key !== 'twitter:card' ? 0 : undefined,
        params: { field: key, fallback: fallbackKey ?? '' },
      });
      continue;
    }

    if (key === 'twitter:image' && !isAbsoluteHttpUrl(value)) {
      const resolved = resolveUrl(value, doc.sourceUrl);
      push({
        code: resolved ? 'twitter.image.relative' : 'image.invalid',
        group: 'twitter',
        key,
        value,
        status: 'warning',
        params: { field: key, resolved },
      });
      continue;
    }

    push({ code: 'twitter.ok', group: 'twitter', key, value, status: 'ok', params: { field: key } });

    const p = dupParams(key);
    if (p) {
      push({
        code: 'twitter.duplicate',
        group: 'twitter',
        key,
        value,
        status: 'warning',
        params: { field: key, ...p },
        weight: 1,
      });
    }
  }

  // A large-image card with no image at all renders as a plain text card.
  {
    const card = doc.twitter.card.trim().toLowerCase();
    const hasTwitterImage = Boolean(doc.twitter.image.trim());
    const hasOgImage = Boolean(doc.og.image.trim());
    if (card === 'summary_large_image' && !hasTwitterImage && !hasOgImage) {
      push({
        code: 'twitter.card.noImage',
        group: 'twitter',
        key: 'twitter:image',
        value: '',
        status: 'warning',
        weight: 2,
        params: { field: 'twitter:image' },
      });
    }
  }

  // ------------------------------------------------------------- images ----
  for (const key of ['og:image', 'twitter:image'] as const) {
    const field = FIELD_BY_KEY[key];
    const raw = getByPath(doc, field.path).trim();
    if (!raw) continue;
    const resolved = resolveUrl(raw, doc.sourceUrl);
    if (!resolved) {
      push({
        code: 'image.invalid',
        group: 'image',
        key,
        value: raw,
        status: 'warning',
        weight: 2,
        params: { field: key },
      });
      continue;
    }
    const probe = probes.find((p) => p.url === resolved);
    if (!probe || probe.status === 'idle' || probe.status === 'loading') {
      push({
        code: 'image.notChecked',
        group: 'image',
        key,
        value: resolved,
        status: 'unverified',
        weight: 1,
        params: { field: key },
      });
      continue;
    }
    if (probe.status === 'timeout') {
      push({
        code: 'image.timeout',
        group: 'image',
        key,
        value: resolved,
        status: 'unverified',
        weight: 2,
        params: { field: key },
      });
      continue;
    }
    if (probe.status === 'error') {
      push({
        code: 'image.unreachable',
        group: 'image',
        key,
        value: resolved,
        status: 'unverified',
        weight: 2,
        params: { field: key, reason: probe.error ?? '' },
      });
      continue;
    }
    const w = probe.width ?? 0;
    const h = probe.height ?? 0;
    if (w < 200 || h < 200) {
      push({
        code: 'image.tooSmall',
        group: 'image',
        key,
        value: resolved,
        status: 'warning',
        weight: 2,
        params: { field: key, w, h },
      });
      continue;
    }
    const ratio = h > 0 ? w / h : 0;
    if (ratio && Math.abs(ratio - 1.91) > 0.55) {
      push({
        code: 'image.aspect',
        group: 'image',
        key,
        value: resolved,
        status: 'warning',
        weight: 1,
        params: { field: key, ratio: ratio.toFixed(2), w, h },
      });
      continue;
    }
    push({
      code: 'image.ok',
      group: 'image',
      key,
      value: resolved,
      status: 'ok',
      weight: 2,
      params: { field: key, w, h },
    });
  }

  return out;
}

/** Groups findings by their check group, preserving declaration order. */
export function groupFindings(findings: Finding[]): Record<string, Finding[]> {
  const out: Record<string, Finding[]> = { basic: [], og: [], twitter: [], image: [] };
  for (const f of findings) {
    (out[f.group] ??= []).push(f);
  }
  return out;
}

export function countByStatus(findings: Finding[]): Record<Status, number> {
  const counts: Record<Status, number> = { ok: 0, missing: 0, warning: 0, unverified: 0 };
  for (const f of findings) counts[f.status] += 1;
  return counts;
}

/** Findings that need the user's attention (everything except `ok`). */
export function problems(findings: Finding[]): Finding[] {
  return findings.filter((f) => f.status !== 'ok');
}
