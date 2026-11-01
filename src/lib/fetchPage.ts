import { normalizeUrlInput } from './url';

/** Max markup we keep from a fetch, in characters. */
export const MAX_FETCH_CHARS = 1_500_000;
export const DIRECT_TIMEOUT_MS = 10_000;
export const ENDPOINT_TIMEOUT_MS = 15_000;

export type FetchFailureCode =
  | 'invalidUrl'
  | 'cors'
  | 'blocked'
  | 'httpError'
  | 'notHtml'
  | 'timeout'
  | 'network'
  | 'tooLarge'
  | 'endpointInvalid'
  | 'endpointError';

export interface FetchSuccess {
  ok: true;
  html: string;
  finalUrl: string;
  status: number;
  truncated: boolean;
  via: 'direct' | 'endpoint';
}

export interface FetchFailure {
  ok: false;
  code: FetchFailureCode;
  detail?: string;
  via: 'direct' | 'endpoint';
}

export type FetchResult = FetchSuccess | FetchFailure;

async function readLimited(
  res: Response,
  max: number,
): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) {
    const text = await res.text();
    return { text: text.slice(0, max), truncated: text.length > max };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let received = 0;
  let out = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        out += decoder.decode(value, { stream: true });
      }
      if (received > max) {
        await reader.cancel().catch(() => undefined);
        return { text: out.slice(0, max), truncated: true };
      }
    }
    out += decoder.decode();
    return { text: out, truncated: false };
  } catch {
    return { text: out.slice(0, max), truncated: true };
  }
}

function withTimeout(ms: number): {
  signal: AbortSignal;
  done: () => void;
  timedOut: () => boolean;
} {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  return {
    signal: controller.signal,
    done: () => clearTimeout(timer),
    timedOut: () => timedOut,
  };
}

/**
 * Mode B: try to get a page's HTML.
 *
 * 1. Attempt a direct CORS fetch. This only works when the target sends
 *    permissive CORS headers — most sites do not.
 * 2. If that fails and a fetch endpoint is configured, ask the endpoint (a
 *    hardened Cloudflare Worker shipped in `worker/`).
 * 3. Otherwise fail loudly. A failed fetch never produces a fake report.
 */
export async function fetchPageHtml(
  input: string,
  endpoint: string | null,
): Promise<FetchResult> {
  const url = normalizeUrlInput(input);
  if (!url) {
    return { ok: false, code: 'invalidUrl', via: 'direct' };
  }

  const direct = await directFetch(url);
  if (direct.ok) return direct;
  if (direct.code === 'httpError' || direct.code === 'notHtml') return direct;

  if (endpoint) {
    const viaEndpoint = await endpointFetch(url, endpoint);
    if (viaEndpoint) return viaEndpoint;
    return { ok: false, code: 'endpointError', via: 'endpoint' };
  }

  return direct;
}

async function directFetch(url: string): Promise<FetchResult> {
  const t = withTimeout(DIRECT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: t.signal,
      redirect: 'follow',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' },
    });
    if (!res.ok) {
      return { ok: false, code: 'httpError', detail: String(res.status), via: 'direct' };
    }
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    if (contentType && !/html|xml|text\/plain/.test(contentType)) {
      return { ok: false, code: 'notHtml', detail: contentType, via: 'direct' };
    }
    const { text, truncated } = await readLimited(res, MAX_FETCH_CHARS);
    return {
      ok: true,
      html: text,
      finalUrl: res.url || url,
      status: res.status,
      truncated,
      via: 'direct',
    };
  } catch (error) {
    if (t.timedOut()) return { ok: false, code: 'timeout', via: 'direct' };
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, code: 'cors', detail: message, via: 'direct' };
  } finally {
    t.done();
  }
}

interface EndpointPayload {
  ok?: boolean;
  html?: string;
  finalUrl?: string;
  status?: number;
  truncated?: boolean;
  error?: string;
  message?: string;
}

async function endpointFetch(url: string, endpoint: string): Promise<FetchResult | null> {
  const t = withTimeout(ENDPOINT_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: t.signal,
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    let payload: EndpointPayload = {};
    try {
      payload = (await res.json()) as EndpointPayload;
    } catch {
      payload = {};
    }

    if (!res.ok || payload.ok !== true || typeof payload.html !== 'string') {
      const code = mapEndpointError(payload.error, res.status);
      return {
        ok: false,
        code,
        detail: payload.message ?? payload.error ?? `HTTP ${res.status}`,
        via: 'endpoint',
      };
    }

    const html = payload.html.slice(0, MAX_FETCH_CHARS);
    return {
      ok: true,
      html,
      finalUrl: payload.finalUrl || url,
      status: payload.status ?? 200,
      truncated: payload.truncated === true || payload.html.length > MAX_FETCH_CHARS,
      via: 'endpoint',
    };
  } catch {
    if (t.timedOut()) return { ok: false, code: 'timeout', via: 'endpoint' };
    return { ok: false, code: 'endpointError', via: 'endpoint' };
  } finally {
    t.done();
  }
}

function mapEndpointError(error: string | undefined, status: number): FetchFailureCode {
  switch (error) {
    case 'blocked':
    case 'private_target':
    case 'dns_private':
    case 'scheme_not_allowed':
      return 'blocked';
    case 'timeout':
      return 'timeout';
    case 'too_large':
      return 'tooLarge';
    case 'not_html':
      return 'notHtml';
    case 'rate_limited':
      return 'httpError';
    case 'invalid_url':
      return 'invalidUrl';
    default:
      if (status === 429) return 'httpError';
      return 'endpointError';
  }
}
