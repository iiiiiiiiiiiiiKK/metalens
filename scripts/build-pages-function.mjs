/**
 * Bundles the Pages Function (`_worker.js`, advanced mode) into dist/ and writes
 * the `_routes.json` that keeps static assets off the function.
 *
 *   node scripts/build-pages-function.mjs [distDir]
 */
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, process.argv[2] ?? 'dist');

await mkdir(outDir, { recursive: true });

const result = await build({
  entryPoints: [resolve(root, 'worker/src/pages.ts')],
  outfile: resolve(outDir, '_worker.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'warning',
});

if (result.errors.length > 0) {
  console.error('Pages function build failed');
  process.exit(1);
}

// Only /api/* invokes the function; every other path is served by the CDN.
await writeFile(
  resolve(outDir, '_routes.json'),
  JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }, null, 2) + '\n',
  'utf8',
);

console.log(`pages function -> ${resolve(outDir, '_worker.js')}`);
