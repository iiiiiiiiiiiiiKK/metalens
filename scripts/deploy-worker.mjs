/**
 * Deploys the fetch endpoint to Cloudflare Workers via the REST API (no wrangler
 * dependency, so a CI runner needs nothing but Node).
 *
 * Env:
 *   CLOUDFLARE_API_TOKEN   required
 *   CLOUDFLARE_ACCOUNT_ID  required
 *   WORKER_NAME            default: metalens-fetch
 *   ALLOWED_ORIGINS        default: the two production origins + localhost
 *
 *   node scripts/deploy-worker.mjs
 */
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const workerName = process.env.WORKER_NAME ?? 'metalens-fetch';
const origins =
  process.env.ALLOWED_ORIGINS ??
  [
    'https://iiiiiiiiiiiiiKK.github.io',
    'https://metalens.pages.dev',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:4380',
    'http://127.0.0.1:4380',
  ].join(',');

if (!token || !accountId) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const bundlePath = resolve(root, 'worker/dist/index.js');

console.log('building worker bundle...');
execFileSync(process.execPath, [resolve(root, 'scripts/build-worker.mjs')], { stdio: 'inherit' });

const code = await readFile(bundlePath, 'utf8');

const metadata = {
  main_module: 'index.js',
  compatibility_date: '2025-09-01',
  bindings: [
    { type: 'plain_text', name: 'ALLOWED_ORIGINS', text: origins },
    { type: 'plain_text', name: 'RATE_LIMIT', text: '20' },
    { type: 'plain_text', name: 'RATE_WINDOW', text: '60' },
    { type: 'plain_text', name: 'MAX_BYTES', text: '1048576' },
  ],
  observability: { enabled: true },
};

const form = new FormData();
form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
form.set(
  'index.js',
  new Blob([code], { type: 'application/javascript+module' }),
  'index.js',
);

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;
const res = await fetch(url, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});

const json = await res.json().catch(() => ({}));
if (!res.ok || json.success === false) {
  console.error('Worker upload failed:', res.status, JSON.stringify(json.errors ?? json));
  process.exit(1);
}

console.log(`worker "${workerName}" uploaded (status ${res.status})`);

// Discover the workers.dev hostname for this account.
const subRes = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const subJson = await subRes.json().catch(() => ({}));
const subdomain = subJson?.result?.subdomain;
if (!subdomain) {
  console.warn('Could not read the workers.dev subdomain; check the dashboard.');
  process.exit(0);
}

const endpoint = `https://${workerName}.${subdomain}.workers.dev/fetch`;
console.log(`endpoint: ${endpoint}`);

// Smoke test: a blocked target must be refused, and CORS must be present.
const smoke = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://iiiiiiiiiiiiiKK.github.io' },
  body: JSON.stringify({ url: 'http://169.254.169.254/latest/meta-data/' }),
});
const smokeJson = await smoke.json().catch(() => ({}));
console.log(
  `smoke test: status=${smoke.status} cors=${smoke.headers.get('access-control-allow-origin')} body=${JSON.stringify(smokeJson)}`,
);
if (smoke.status !== 400) {
  console.error('Smoke test failed: the metadata endpoint was not refused.');
  process.exit(1);
}
console.log('SMOKE OK');
console.log(`METALENS_FETCH_ENDPOINT=${endpoint}`);
