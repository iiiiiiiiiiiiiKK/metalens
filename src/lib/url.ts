/** URL helpers. Everything here is pure so it is trivially unit-testable. */

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

/** True for a trimmed value that starts with an http:// or https:// scheme. */
export function isAbsoluteHttpUrl(value: string): boolean {
  const raw = (value ?? '').trim();
  if (!/^https?:\/\//i.test(raw)) return false;
  try {
    const u = new URL(raw);
    return HTTP_PROTOCOLS.has(u.protocol) && u.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Turns user input into a fetchable absolute http(s) URL.
 * `example.com` -> `https://example.com/`. Returns null for anything else
 * (javascript:, data:, file:, ftp:, ...).
 */
export function normalizeUrlInput(input: string): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (!HTTP_PROTOCOLS.has(u.protocol)) return null;
    if (!u.hostname || !u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Resolves a possibly-relative reference against a base URL.
 * Returns '' when the reference cannot be resolved to an http(s) URL.
 */
export function resolveUrl(value: string, base: string): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  if (isAbsoluteHttpUrl(raw)) return raw;
  // Protocol-relative references (`//cdn.example.com/a.png`) are common in og:image.
  if (raw.startsWith('//')) {
    const scheme = base && isAbsoluteHttpUrl(base) ? new URL(base).protocol : 'https:';
    try {
      return new URL(`${scheme}${raw}`).toString();
    } catch {
      return '';
    }
  }
  if (!base) return '';
  try {
    const resolved = new URL(raw, base);
    return HTTP_PROTOCOLS.has(resolved.protocol) ? resolved.toString() : '';
  } catch {
    return '';
  }
}

/** Hostname without `www.`, used for the domain line on share cards. */
export function displayDomain(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Compares two URLs the way a canonical check should: scheme/host are
 * case-insensitive, a trailing slash and the fragment are ignored.
 */
export function sameUrl(a: string, b: string): boolean {
  const na = canonicalize(a);
  const nb = canonicalize(b);
  if (!na || !nb) return false;
  return na === nb;
}

function canonicalize(url: string): string {
  const raw = (url ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (!HTTP_PROTOCOLS.has(u.protocol)) return '';
    u.hash = '';
    let path = u.pathname.replace(/\/+$/, '');
    if (path === '') path = '/';
    return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}${path}${u.search}`;
  } catch {
    return '';
  }
}

/** Trims, collapses internal whitespace and strips control characters. */
export function cleanText(value: string): string {
  return (value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Length in user-perceived characters (code points, not UTF-16 units). */
export function charLength(value: string): number {
  return Array.from(value ?? '').length;
}
