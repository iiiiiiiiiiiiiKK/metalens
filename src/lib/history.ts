import { readJSON, removeKey, writeJSON } from './storage';
import type { HistoryEntry, SourceMode } from './types';

export const HISTORY_KEY = 'metalens.history.v1';
export const HISTORY_LIMIT = 25;

/** Coerces anything read back from storage into a valid entry. */
function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Partial<HistoryEntry>;
  return (
    typeof e.id === 'string' &&
    typeof e.checkedAt === 'number' &&
    typeof e.url === 'string' &&
    typeof e.title === 'string' &&
    typeof e.score === 'number'
  );
}

export function loadHistory(): HistoryEntry[] {
  const raw = readJSON<unknown[]>(HISTORY_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isEntry).sort((a, b) => b.checkedAt - a.checkedAt).slice(0, HISTORY_LIMIT);
}

export function saveHistory(entries: HistoryEntry[]): void {
  writeJSON(HISTORY_KEY, entries.slice(0, HISTORY_LIMIT));
}

export function historyStatus(score: number): HistoryEntry['status'] {
  if (score >= 75) return 'ok';
  if (score > 0) return 'warn';
  return 'error';
}

export interface NewHistoryInput {
  url: string;
  title: string;
  mode: SourceMode;
  score: number;
  /** Epoch millis; injectable so tests are deterministic. */
  now?: number;
  id?: string;
}

/**
 * Adds an entry, replacing an earlier check of the same thing and keeping the
 * list capped at HISTORY_LIMIT.
 *
 * De-duplication keys on the URL for real pages, but falls back to the page
 * title when there is no URL (pasted HTML / manual mode), otherwise every
 * pasted snippet would collapse into a single entry.
 */
export function addHistoryEntry(entries: HistoryEntry[], input: NewHistoryInput): HistoryEntry[] {
  const now = input.now ?? Date.now();
  const id = input.id ?? `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: HistoryEntry = {
    id,
    url: input.url,
    title: input.title,
    mode: input.mode,
    checkedAt: now,
    score: input.score,
    status: historyStatus(input.score),
  };

  const url = input.url.trim();
  const isRealUrl = /^https?:\/\//i.test(url);
  const title = input.title.trim();

  const withoutSame = entries.filter((existing) => {
    if (isRealUrl) return existing.url !== url;
    if (!title) return existing.id !== id;
    return !(existing.title === title && !/^https?:\/\//i.test(existing.url));
  });
  return [entry, ...withoutSame].slice(0, HISTORY_LIMIT);
}

export function removeHistoryEntry(entries: HistoryEntry[], id: string): HistoryEntry[] {
  return entries.filter((e) => e.id !== id);
}

export function clearHistory(): void {
  removeKey(HISTORY_KEY);
}
