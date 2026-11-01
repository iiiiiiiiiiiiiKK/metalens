import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyze } from '../../src/lib/analysis';
import { computeHealth, groupPercent, GRADE_THRESHOLDS, STATUS_VALUE } from '../../src/lib/health';
import { parseHtml } from '../../src/lib/parse';
import type { Finding, Status } from '../../src/lib/types';

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), 'tests/unit/fixtures', name), 'utf8');

function finding(weight: number, status: Status, group: Finding['group'] = 'basic'): Finding {
  return {
    id: `f-${weight}-${status}-${Math.random()}`,
    code: 'title.ok',
    group,
    field: 'title',
    path: 'title',
    value: '',
    status,
    weight,
  };
}

describe('computeHealth', () => {
  it('gives a perfect score to a complete document', () => {
    const parsed = parseHtml(fixture('complete.html'), {
      sourceUrl: 'https://example.com/complete',
    });
    const findings = analyze(parsed.doc, parsed.report, [
      { url: 'https://example.com/cover.png', status: 'ok', width: 1200, height: 630 },
      { url: 'https://example.com/twitter.png', status: 'ok', width: 1200, height: 630 },
    ]);
    const health = computeHealth(findings);
    expect(health.score).toBe(100);
    expect(health.grade).toBe('excellent');
    expect(health.counts.missing).toBe(0);
  });

  it('follows the published formula', () => {
    // one weight-3 field OK and one weight-1 field missing -> 3 / 4 = 75
    const health = computeHealth([finding(3, 'ok'), finding(1, 'missing')]);
    expect(health.score).toBe(75);
    expect(health.grade).toBe('good');
  });

  it('uses the documented partial credit values', () => {
    expect(STATUS_VALUE.ok).toBe(1);
    expect(STATUS_VALUE.unverified).toBe(0.75);
    expect(STATUS_VALUE.warning).toBe(0.55);
    expect(STATUS_VALUE.missing).toBe(0);

    const half = computeHealth([finding(2, 'warning'), finding(2, 'ok')]);
    expect(half.score).toBe(Math.round(((2 * 0.55 + 2 * 1) / 4) * 100));
  });

  it('ignores zero-weight informational findings', () => {
    const withInfo = computeHealth([finding(3, 'ok'), finding(0, 'missing')]);
    expect(withInfo.score).toBe(100);
    expect(withInfo.counts.missing).toBe(1);
  });

  it('scores an empty finding list as 0, never 100', () => {
    expect(computeHealth([]).score).toBe(0);
  });

  it('maps scores onto the documented grades', () => {
    const at = (score: number) => {
      const ok = finding(score, 'ok', 'og');
      const miss = finding(100 - score, 'missing', 'og');
      return computeHealth([ok, miss]).grade;
    };
    expect(at(GRADE_THRESHOLDS.excellent)).toBe('excellent');
    expect(at(GRADE_THRESHOLDS.good)).toBe('good');
    expect(at(GRADE_THRESHOLDS.fair)).toBe('fair');
    expect(at(10)).toBe('poor');
  });

  it('breaks the score down per group', () => {
    const health = computeHealth([
      finding(2, 'ok', 'basic'),
      finding(2, 'missing', 'og'),
    ]);
    const basic = health.groups.find((g) => g.group === 'basic');
    const og = health.groups.find((g) => g.group === 'og');
    expect(groupPercent(basic!)).toBe(100);
    expect(groupPercent(og!)).toBe(0);
    expect(groupPercent(health.groups.find((g) => g.group === 'image')!)).toBe(0);
  });

  it('counts every status', () => {
    const health = computeHealth([
      finding(1, 'ok'),
      finding(1, 'warning'),
      finding(1, 'missing'),
      finding(1, 'unverified'),
    ]);
    expect(health.counts).toEqual({ ok: 1, warning: 1, missing: 1, unverified: 1 });
    expect(health.total).toBe(4);
  });
});
