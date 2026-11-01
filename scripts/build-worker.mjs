/**
 * Bundles worker/src/index.ts into a single ES module for upload.
 *
 *   node scripts/build-worker.mjs
 */
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = resolve(root, 'worker/dist/index.js');

await mkdir(dirname(outfile), { recursive: true });

const result = await build({
  entryPoints: [resolve(root, 'worker/src/index.ts')],
  outfile,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  minify: false,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
});

if (result.errors.length > 0) {
  console.error('Worker build failed');
  process.exit(1);
}

console.log(`worker bundle -> ${outfile}`);
