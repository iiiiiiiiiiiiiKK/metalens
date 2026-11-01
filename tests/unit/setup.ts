/** Shared test setup: jsdom already provides DOMParser, Image and localStorage. */
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
