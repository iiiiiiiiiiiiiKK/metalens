/**
 * Deploys the static build to Cloudflare Pages with a direct upload.
 *
 * Env:
 *   CLOUDFLARE_API_TOKEN   required
 *   CLOUDFLARE_ACCOUNT_ID  required
 *   PAGES_PROJECT          default: metalens
 *   VITE_BASE_PATH         default: /
 *
 *   node scripts/deploy-pages.mjs
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve, sep } from 'node:path';

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const project = process.env.PAGES_PROJECT ?? 'metalens';
const base = process.env.VITE_BASE_PATH ?? '/';

if (!token || !accountId) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const api = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`;
const auth = { Authorization: `Bearer ${token}` };

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

console.log(`building static site (base=${base})...`);
execFileSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE_PATH: base },
});

console.log('building Pages Function (/api/fetch)...');
execFileSync(process.execPath, [resolve(root, 'scripts/build-pages-function.mjs'), dist], {
  cwd: root,
  stdio: 'inherit',
});

// 1. Ensure the project exists.
let created = false;
const createRes = await fetch(api, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: project, production_branch: 'main' }),
});
const createJson = await createRes.json().catch(() => ({}));
if (createRes.ok) {
  created = true;
  console.log(`created Pages project "${project}"`);
} else {
  const alreadyExists = JSON.stringify(createJson.errors ?? []).includes('already exists');
  console.log(
    alreadyExists
      ? `Pages project "${project}" already exists`
      : `create returned ${createRes.status}: ${JSON.stringify(createJson.errors ?? {})}`,
  );
}

// 2. Build the upload manifest.
const files = await walk(dist);
const manifest = {};
const blobs = new Map();
for (const file of files) {
  const contents = await readFile(file);
  const hash = createHash('md5').update(contents).digest('hex');
  const path = '/' + relative(dist, file).split(sep).join('/');
  manifest[path] = hash;
  blobs.set(hash, { contents, path });
}

const form = new FormData();
form.set('manifest', new Blob([JSON.stringify(manifest)], { type: 'application/json' }));
for (const [hash, { contents, path }] of blobs) {
  form.set(hash, new Blob([contents]), path.split('/').pop() || 'file');
}

console.log(`uploading ${files.length} files (${blobs.size} unique blobs)...`);
const deployRes = await fetch(`${api}/${project}/deployments`, {
  method: 'POST',
  headers: auth,
  body: form,
});
const deployJson = await deployRes.json().catch(() => ({}));

if (!deployRes.ok || deployJson.success === false) {
  console.error('deploy failed:', deployRes.status, JSON.stringify(deployJson.errors ?? deployJson));
  process.exit(1);
}

const result = deployJson.result ?? {};
console.log(`deployment id: ${result.id}`);
console.log(`deployment url: ${result.url}`);
console.log(`production url: https://${project}.pages.dev`);
if (result.aliases) console.log(`aliases: ${JSON.stringify(result.aliases)}`);
console.log(`METALENS_PAGES_URL=${result.url ?? `https://${project}.pages.dev`}`);
console.log(created ? 'PROJECT_CREATED=1' : 'PROJECT_CREATED=0');
