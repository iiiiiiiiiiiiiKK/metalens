/**
 * A tiny storage wrapper that degrades gracefully.
 *
 * Safari private mode, disabled cookies and storage quotas all throw on
 * `localStorage` access; every failure falls back to an in-memory store so the
 * app keeps working (history just does not survive a reload).
 */

const memory = new Map<string, string>();

function getBackend(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__metalens_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const backend = getBackend();
  const raw = backend ? backend.getItem(key) : (memory.get(key) ?? null);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  const serialized = JSON.stringify(value);
  const backend = getBackend();
  if (!backend) {
    memory.set(key, serialized);
    return false;
  }
  try {
    backend.setItem(key, serialized);
    return true;
  } catch {
    memory.set(key, serialized);
    return false;
  }
}

export function removeKey(key: string): void {
  memory.delete(key);
  const backend = getBackend();
  if (!backend) return;
  try {
    backend.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readString(key: string): string | null {
  const backend = getBackend();
  try {
    return backend ? backend.getItem(key) : (memory.get(key) ?? null);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeString(key: string, value: string): void {
  const backend = getBackend();
  if (!backend) {
    memory.set(key, value);
    return;
  }
  try {
    backend.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}
