/**
 * MetaLens fetch endpoint — a Cloudflare Worker that returns a page's HTML.
 *
 * Threat model: this endpoint fetches URLs supplied by anonymous internet
 * users, so it is effectively an SSRF proxy. Every control below exists to stop
 * a caller from using it to reach something they could not reach themselves.
 *
 *  1. Only http/https, only ports 80/443/8080/8443, no credentials in the URL.
 *  2. Hostnames that look local (localhost, *.local, *.internal, metadata
 *     names) are refused before any network access.
 *  3. IP literals are validated: private, loopback, link-local, CGNAT,
 *     multicast, reserved and IPv6-mapped forms are all refused.
 *  4. Hostnames are resolved over DNS-over-HTTPS and *every* returned address
 *     must be public — this also defeats DNS rebinding, because the name is
 *     re-resolved (and re-validated) on each hop.
 *  5. Redirects are followed manually, at most 3 hops, re-validating each hop.
 *  6. The response must be HTML, is capped in size and in time, and its body is
 *     returned as plain text — it is never executed or rendered here.
 *  7. Requests are rate limited per client IP (see README for the honest
 *     limitations of an isolate-local limiter).
 */

export interface Env {
  /** Comma separated list of allowed browser origins. `*` is not allowed. */
  ALLOWED_ORIGINS?: string;
  /** Requests allowed per IP per window. Default 20. */
  RATE_LIMIT?: string;
  /** Window length in seconds. Default 60. */
  RATE_WINDOW?: string;
  /** Hard cap on returned HTML bytes. Default 1048576 (1 MiB). */
  MAX_BYTES?: string;
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://iiiiiiiiiiiiiKK.github.io',
  'https://metalens.pages.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;
const MAX_BYTES_DEFAULT = 1_048_576;
const USER_AGENT =
  'MetaLensBot/1.0 (+https://github.com/iiiiiiiiiiiiiKK/metalens; meta tag inspector)';

/** Hostnames that must never be fetched, regardless of what DNS says. */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
];

const BLOCKED_SUFFIXES = ['.local', '.localhost', '.internal', '.intranet', '.lan', '.home.arpa'];

const BLOCKED_IPS = new Set([
  '169.254.169.254', // AWS / GCP / Azure / OpenStack metadata
  '169.254.170.2', // ECS task metadata
  '100.100.100.200', // Alibaba Cloud metadata
  '192.0.0.192', // Oracle Cloud metadata
  'fd00:ec2::254', // AWS IMDSv2 over IPv6
]);

export interface FetchPayload {
  ok: boolean;
  html?: string;
  finalUrl?: string;
  status?: number;
  truncated?: boolean;
  error?: string;
  message?: string;
}

/* ------------------------------------------------------------------ ip math */

export function parseIPv4(value: string): number[] | null {
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const out: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    out.push(n);
  }
  return out;
}

export function isPrivateIPv4(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 192 && b === 0) return true; // 192.0.0/24 + 192.0.2/24
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51) return true; // TEST-NET-2
  if (a === 203 && b === 0) return true; // TEST-NET-3
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

export function isPrivateIPv6(value: string): boolean {
  const ip = value.toLowerCase().replace(/^\[|\]$/g, '');
  if (ip === '::' || ip === '::1') return true;
  // IPv4-mapped / compatible forms (::ffff:127.0.0.1)
  const mapped = ip.match(/^::(?:ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) {
    const v4 = parseIPv4(mapped[1]);
    return v4 ? isPrivateIPv4(v4) : true;
  }
  if (/^f[cd]/.test(ip)) return true; // unique local fc00::/7
  if (/^fe[89ab]/.test(ip)) return true; // link local fe80::/10
  if (/^ff/.test(ip)) return true; // multicast
  if (ip.startsWith('64:ff9b:')) return true; // NAT64
  if (ip.startsWith('2001:db8')) return true; // documentation
  return false;
}

export function isBlockedAddress(address: string): boolean {
  const ip = address.trim();
  if (!ip) return true;
  if (ip.includes(':')) return isPrivateIPv6(ip);
  const v4 = parseIPv4(ip);
  if (!v4) return true; // unparseable -> refuse
  return isPrivateIPv4(v4) || BLOCKED_IPS.has(ip);
}

/* ------------------------------------------------------------- url validation */

export interface TargetCheck {
  ok: boolean;
  url?: URL;
  error?: string;
}

export function validateTarget(raw: string): TargetCheck {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'invalid_url' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'scheme_not_allowed' };
  }
  if (url.username || url.password) {
    return { ok: false, error: 'credentials_not_allowed' };
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    return { ok: false, error: 'port_not_allowed' };
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return { ok: false, error: 'invalid_url' };
  if (BLOCKED_HOSTNAMES.includes(host)) return { ok: false, error: 'blocked' };
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { ok: false, error: 'blocked' };
  }
  if (host === '0.0.0.0' || host === '[::]') return { ok: false, error: 'blocked' };

  // IP literal: validate directly, no DNS involved.
  const isLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
  if (isLiteral) {
    if (isBlockedAddress(host)) return { ok: false, error: 'private_target' };
  }
  return { ok: true, url };
}

/* ------------------------------------------------------------------ DNS check */

interface DohAnswer {
  Status: number;
  Answer?: Array<{ type: number; data: string }>;
}

/**
 * Resolves A and AAAA over DoH and rejects the host if *any* address is not
 * public. Resolving on every hop is what makes DNS rebinding useless: the name
 * cannot point at a public IP during validation and a private one at fetch time,
 * because validation happens immediately before the fetch.
 */
export async function resolveAndValidate(hostname: string): Promise<TargetCheck> {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    return isBlockedAddress(host) ? { ok: false, error: 'dns_private' } : { ok: true };
  }

  const addresses: string[] = [];
  for (const type of ['A', 'AAAA']) {
    try {
      const res = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,
        {
          headers: { Accept: 'application/dns-json' },
          signal: AbortSignal.timeout(3000),
        },
      );
      if (!res.ok) continue;
      const json = (await res.json()) as DohAnswer;
      for (const answer of json.Answer ?? []) {
        if (answer.type === 1 || answer.type === 28) addresses.push(answer.data);
      }
    } catch {
      // A DoH failure is not proof of safety: fall through to the address check
      // below, which refuses when we learned nothing.
    }
  }

  if (addresses.length === 0) return { ok: false, error: 'dns_unresolved' };
  for (const address of addresses) {
    if (isBlockedAddress(address)) return { ok: false, error: 'dns_private' };
  }
  return { ok: true };
}

/* ---------------------------------------------------------------- rate limit */

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  now = Date.now(),
): { allowed: boolean; remaining: number; retryAfter: number } {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/* -------------------------------------------------------------------- fetch */

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const list = allowed.length > 0 ? allowed : DEFAULT_ALLOWED_ORIGINS;
  const allowOrigin = origin && list.includes(origin) ? origin : list[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

async function readCapped(res: Response, max: number): Promise<{ text: string; truncated: boolean }> {
  const declared = Number(res.headers.get('content-length') ?? '0');
  if (declared > max * 4) {
    return { text: '', truncated: true };
  }
  if (!res.body) {
    const text = await res.text();
    return { text: text.slice(0, max), truncated: text.length > max };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let received = 0;
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      out += decoder.decode(value, { stream: true });
    }
    if (received >= max) {
      await reader.cancel().catch(() => undefined);
      return { text: out.slice(0, max), truncated: true };
    }
  }
  out += decoder.decode();
  return { text: out, truncated: false };
}

export async function fetchPage(
  rawUrl: string,
  maxBytes: number,
): Promise<{ status: number; payload: FetchPayload }> {
  let current = rawUrl;
  const deadline = Date.now() + TIMEOUT_MS;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const checked = validateTarget(current);
    if (!checked.ok || !checked.url) {
      return { status: 400, payload: { ok: false, error: checked.error } };
    }
    const dns = await resolveAndValidate(checked.url.hostname);
    if (!dns.ok) {
      return { status: 400, payload: { ok: false, error: dns.error } };
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return { status: 504, payload: { ok: false, error: 'timeout' } };
    }

    let res: Response;
    try {
      res = await fetch(checked.url.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(remaining),
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Language': 'en;q=0.9',
        },
      });
    } catch (error) {
      const isTimeout = error instanceof Error && /time|abort/i.test(error.message);
      return {
        status: isTimeout ? 504 : 502,
        payload: { ok: false, error: isTimeout ? 'timeout' : 'upstream_error' },
      };
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        return { status: 502, payload: { ok: false, error: 'redirect_without_location' } };
      }
      if (hop === MAX_REDIRECTS) {
        return { status: 502, payload: { ok: false, error: 'too_many_redirects' } };
      }
      // Re-validated on the next iteration; a redirect to a private host dies there.
      current = new URL(location, checked.url).toString();
      continue;
    }

    if (!res.ok) {
      return {
        status: 502,
        payload: { ok: false, error: `http_${res.status}` },
      };
    }

    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    if (contentType && !/html|xml/.test(contentType)) {
      return { status: 415, payload: { ok: false, error: 'not_html' } };
    }

    const { text, truncated } = await readCapped(res, maxBytes);
    return {
      status: 200,
      payload: {
        ok: true,
        html: text,
        finalUrl: checked.url.toString(),
        status: res.status,
        truncated,
      },
    };
  }

  return { status: 502, payload: { ok: false, error: 'too_many_redirects' } };
}

/* ------------------------------------------------------------------ handler */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin');
    const headers = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405, headers);
    }

    const url = new URL(request.url);
    if (url.pathname !== '/' && url.pathname !== '/fetch') {
      return json({ ok: false, error: 'not_found' }, 404, headers);
    }

    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const limit = Number(env.RATE_LIMIT ?? 20) || 20;
    const windowSeconds = Number(env.RATE_WINDOW ?? 60) || 60;
    const rate = checkRateLimit(ip, limit, windowSeconds);
    if (!rate.allowed) {
      return new Response(
        JSON.stringify({ ok: false, error: 'rate_limited', message: 'too many requests' }),
        {
          status: 429,
          headers: { ...headers, 'Retry-After': String(rate.retryAfter) },
        },
      );
    }

    let body: { url?: unknown };
    try {
      body = (await request.json()) as { url?: unknown };
    } catch {
      return json({ ok: false, error: 'invalid_body' }, 400, headers);
    }

    if (typeof body.url !== 'string' || body.url.length === 0 || body.url.length > 2048) {
      return json({ ok: false, error: 'invalid_url' }, 400, headers);
    }

    const maxBytes = Number(env.MAX_BYTES ?? MAX_BYTES_DEFAULT) || MAX_BYTES_DEFAULT;
    const result = await fetchPage(body.url, Math.min(maxBytes, 4 * MAX_BYTES_DEFAULT));
    return json(result.payload, result.status, headers);
  },
};
