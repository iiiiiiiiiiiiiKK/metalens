import type { Finding, Group, HealthGroupScore, HealthResult, Status } from './types';

/**
 * How each status maps to partial credit. Published in the app ("How the score
 * works") and in the README so the number is never a black box.
 */
export const STATUS_VALUE: Record<Status, number> = {
  ok: 1,
  warning: 0.55,
  unverified: 0.75,
  missing: 0,
};

export const GRADE_THRESHOLDS = { excellent: 90, good: 75, fair: 50 } as const;

export const GROUP_ORDER: Group[] = ['basic', 'og', 'twitter', 'image'];

/**
 * Weighted health score in 0..100.
 *
 * `score = round(100 * Σ(weight × statusValue) / Σ(weight))`
 *
 * Findings with weight 0 are informational and are excluded from both sides of
 * the fraction. An empty finding list scores 0, never 100.
 */
export function computeHealth(findings: Finding[]): HealthResult {
  const groups: HealthGroupScore[] = GROUP_ORDER.map((group) => ({
    group,
    earned: 0,
    possible: 0,
  }));
  const counts: Record<Status, number> = { ok: 0, missing: 0, warning: 0, unverified: 0 };

  let earned = 0;
  let possible = 0;

  for (const f of findings) {
    counts[f.status] += 1;
    if (f.weight <= 0) continue;
    const credit = f.weight * STATUS_VALUE[f.status];
    earned += credit;
    possible += f.weight;
    const bucket = groups.find((g) => g.group === f.group);
    if (bucket) {
      bucket.earned += credit;
      bucket.possible += f.weight;
    }
  }

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  const grade: HealthResult['grade'] =
    score >= GRADE_THRESHOLDS.excellent
      ? 'excellent'
      : score >= GRADE_THRESHOLDS.good
        ? 'good'
        : score >= GRADE_THRESHOLDS.fair
          ? 'fair'
          : 'poor';

  return { score, grade, groups, counts, total: findings.length };
}

/** Percentage for one group, 0 when the group has no weighted findings. */
export function groupPercent(group: HealthGroupScore): number {
  if (group.possible <= 0) return 0;
  return Math.round((group.earned / group.possible) * 100);
}
