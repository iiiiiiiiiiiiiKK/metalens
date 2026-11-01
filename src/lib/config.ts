import { readString, writeString } from './storage';

export interface RuntimeConfig {
  /** Optional URL of a self-hosted fetch endpoint (see `worker/`). */
  fetchEndpoint: string;
  /** Free-form build identifier, useful when debugging a deployment. */
  build?: string;
}

export const EMPTY_CONFIG: RuntimeConfig = { fetchEndpoint: '' };
export const SETTINGS_KEY = 'metalens.fetchEndpoint.v1';

/**
 * Runtime configuration is read from `runtime-config.json` next to `index.html`
 * so the same build can run on GitHub Pages, Cloudflare Pages or localhost with
 * different backends. A value saved in the settings panel always wins.
 */
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const override = readString(SETTINGS_KEY);
  let config: RuntimeConfig = { ...EMPTY_CONFIG };
  try {
    const base = import.meta.env.BASE_URL ?? '/';
    const res = await fetch(`${base.replace(/\/$/, '')}/runtime-config.json`, {
      cache: 'no-cache',
      credentials: 'omit',
    });
    if (res.ok) {
      const json = (await res.json()) as Partial<RuntimeConfig>;
      config = {
        fetchEndpoint: typeof json.fetchEndpoint === 'string' ? json.fetchEndpoint : '',
        ...(typeof json.build === 'string' ? { build: json.build } : {}),
      };
    }
  } catch {
    // No config file is a valid state: URL mode then explains its limits.
  }
  if (override !== null) config.fetchEndpoint = override.trim();
  return config;
}

export function saveFetchEndpoint(endpoint: string): void {
  writeString(SETTINGS_KEY, endpoint.trim());
}

/** Only http(s) endpoints are accepted, so a pasted `javascript:` URL is inert. */
export function isValidEndpoint(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
