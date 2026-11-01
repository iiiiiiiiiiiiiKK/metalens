import type { ImageProbe } from './types';

/**
 * Loads an image just far enough to read its intrinsic size.
 *
 * We never fabricate a size: if the image cannot be loaded (404, hotlink
 * protection, CORS, offline) the probe reports `error` and the UI says so.
 */
export function probeImage(url: string, timeoutMs = 8000): Promise<ImageProbe> {
  if (!url) return Promise.resolve({ url, status: 'idle' });
  if (typeof Image === 'undefined') return Promise.resolve({ url, status: 'idle' });

  return new Promise<ImageProbe>((resolve) => {
    let settled = false;
    const img = new Image();
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      img.src = '';
      resolve({ url, status: 'timeout', error: 'timeout' });
    }, timeoutMs);

    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!img.naturalWidth || !img.naturalHeight) {
        resolve({ url, status: 'error', error: 'empty-image' });
        return;
      }
      resolve({
        url,
        status: 'ok',
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ url, status: 'error', error: 'load-failed' });
    };

    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.src = url;
  });
}
