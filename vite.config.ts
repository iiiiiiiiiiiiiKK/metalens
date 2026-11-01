import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Injects a Content-Security-Policy <meta> tag into the production build only
 * (the Vite dev server needs inline scripts for HMR).
 *
 * `img-src` allows arbitrary https hosts because previewing a real og:image is
 * the whole point of the product; `connect-src` allows https because the
 * optional URL fetch endpoint is operator-configurable at runtime.
 */
function cspPlugin(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');

  return {
    name: 'metalens-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '</title>',
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      );
    },
  };
}

export default defineConfig({
  // A project page on GitHub Pages is served from /<repo>/ while Cloudflare
  // Pages serves from the domain root, so the base path is build-time input.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss(), cspPlugin()],
  build: {
    target: 'es2022',
    cssTarget: 'safari15',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  preview: {
    port: 4173,
    host: '127.0.0.1',
  },
});
