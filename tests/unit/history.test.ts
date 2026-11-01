import { describe, expect, it } from 'vitest';
import {
  addHistoryEntry,
  clearHistory,
  historyStatus,
  HISTORY_KEY,
  HISTORY_LIMIT,
  loadHistory,
  removeHistoryEntry,
  saveHistory,
} from '../../src/lib/history';
import type { HistoryEntry } from '../../src/lib/types';

const entry = (id: string, url = 'https://example.com', now = 1000): HistoryEntry => ({
  id,
  url,
  title: 'Title',
  mode: 'url',
  checkedAt: now,
  score: 80,
  status: 'ok',
});

describe('addHistoryEntry', () => {
  it('puts the newest entry first', () => {
    const list = addHistoryEntry([entry('old', 'https://a.com')], {
      url: 'https://b.com',
      title: 'B',
      mode: 'url',
      score: 90,
      id: 'new',
      now: 2000,
    });
    expect(list.map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('de-duplicates by URL so re-checking does not pile up', () => {
    const first = addHistoryEntry([], {
      url: 'https://a.com',
      title: 'A',
      mode: 'url',
      score: 50,
      id: '1',
      now: 1,
    });
    const second = addHistoryEntry(first, {
      url: 'https://a.com',
      title: 'A',
      mode: 'url',
      score: 90,
      id: '2',
      now: 2,
    });
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe('2');
    expect(second[0].score).toBe(90);
  });

  it('keys pasted HTML entries by title instead of the synthetic URL', () => {
    let list: HistoryEntry[] = [];
    list = addHistoryEntry(list, {
      url: 'about:html-input',
      title: 'Page A',
      mode: 'html',
      score: 60,
      now: 1,
    });
    list = addHistoryEntry(list, {
      url: 'about:html-input',
      title: 'Page B',
      mode: 'html',
      score: 60,
      now: 2,
    });
    expect(list).toHaveLength(2);

    list = addHistoryEntry(list, {
      url: 'about:html-input',
      title: 'Page A',
      mode: 'html',
      score: 90,
      now: 3,
    });
    expect(list).toHaveLength(2);
    expect(list[0].title).toBe('Page A');
    expect(list[0].score).toBe(90);
  });

  it('keeps URL-less entries without a title separate', () => {
    let list: HistoryEntry[] = [];
    list = addHistoryEntry(list, {
      url: '',
      title: '',
      mode: 'manual',
      score: 10,
      id: 'a',
      now: 1,
    });
    list = addHistoryEntry(list, {
      url: '',
      title: '',
      mode: 'manual',
      score: 20,
      id: 'b',
      now: 2,
    });
    expect(list).toHaveLength(2);
  });

  it('caps the list at the documented limit', () => {
    let list: HistoryEntry[] = [];
    for (let i = 0; i < HISTORY_LIMIT + 10; i += 1) {
      list = addHistoryEntry(list, {
        url: `https://example.com/${i}`,
        title: `T${i}`,
        mode: 'url',
        score: 70,
        id: `id-${i}`,
        now: 1000 + i,
      });
    }
    expect(list).toHaveLength(HISTORY_LIMIT);
    expect(list[0].url).toBe(`https://example.com/${HISTORY_LIMIT + 9}`);
  });

  it('derives the status from the score', () => {
    const list = addHistoryEntry([], { url: '', title: 'x', mode: 'manual', score: 40 });
    expect(list[0].status).toBe('warn');
    expect(historyStatus(0)).toBe('error');
    expect(historyStatus(90)).toBe('ok');
  });
});

describe('persistence', () => {
  it('round-trips through localStorage', () => {
    const list = [entry('a', 'https://a.com', 3000), entry('b', 'https://b.com', 1000)];
    saveHistory(list);
    expect(localStorage.getItem(HISTORY_KEY)).toContain('https://a.com');
    expect(loadHistory().map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('sorts loaded entries newest first', () => {
    saveHistory([entry('older', 'https://x.com', 1), entry('newer', 'https://y.com', 9)]);
    expect(loadHistory()[0].id).toBe('newer');
  });

  it('survives corrupt storage', () => {
    localStorage.setItem(HISTORY_KEY, '{not json');
    expect(loadHistory()).toEqual([]);
  });

  it('drops entries with the wrong shape', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([{ id: 1 }, entry('good')]));
    expect(loadHistory()).toHaveLength(1);
  });

  it('clears everything', () => {
    saveHistory([entry('a')]);
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });
});

describe('removeHistoryEntry', () => {
  it('removes only the requested entry', () => {
    const list = [entry('a'), entry('b', 'https://b.com')];
    expect(removeHistoryEntry(list, 'a').map((e) => e.id)).toEqual(['b']);
  });

  it('is a no-op for an unknown id', () => {
    const list = [entry('a')];
    expect(removeHistoryEntry(list, 'zzz')).toHaveLength(1);
  });
});
