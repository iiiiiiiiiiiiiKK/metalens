/**
 * Cloudflare Pages entry point (advanced mode `_worker.js`).
 *
 * The reference deployment serves the fetch API from the same domain as the
 * static site (`/api/fetch`), which removes CORS from the critical path and
 * keeps a single origin in the logs. The logic itself lives in `./index.ts` so
 * the standalone Worker build and this one can never drift apart.
 */
import worker from './index';

interface Env {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT?: string;
  RATE_WINDOW?: string;
  MAX_BYTES?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          ok: true,
          service: 'metalens-fetch',
          mode: 'pages-function',
          origins: (env.ALLOWED_ORIGINS ?? 'default').split(',').length,
        }),
        { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
      );
    }

    if (url.pathname === '/api/fetch') {
      // Re-dispatch into the shared handler using its own route name.
      const inner = new URL(request.url);
      inner.pathname = '/fetch';
      const forwarded = new Request(inner.toString(), request);
      return worker.fetch(forwarded, env as never);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

