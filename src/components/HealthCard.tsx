import { Info } from 'lucide-react';
import type { Translator } from '../i18n';
import { groupPercent } from '../lib/health';
import type { Group, HealthResult } from '../lib/types';
import { Gauge } from './chips';

const GROUP_LABEL: Record<Group, string> = {
  basic: 'group.basic',
  og: 'group.og',
  twitter: 'group.twitter',
  image: 'group.image',
};

const GRADE_STYLE: Record<HealthResult['grade'], string> = {
  excellent: 'text-ok',
  good: 'text-ok',
  fair: 'text-warn',
  poor: 'text-err',
};

/**
 * The health number is always shown together with the raw counts and the
 * per-group breakdown, and the scoring rules are one click away — never a
 * mystery percentage on its own.
 */
export function HealthCard({
  t,
  health,
  onShowRules,
}: {
  t: Translator;
  health: HealthResult;
  onShowRules: () => void;
}) {
  const problems = health.counts.missing + health.counts.warning;

  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-end gap-2">
          <span
            className={`tnum text-[34px] font-semibold leading-none tracking-tight ${GRADE_STYLE[health.grade]}`}
            data-testid="health-score"
          >
            {health.score}
          </span>
          <div className="mb-0.5 min-w-0">
            <p className="text-[11px] leading-tight text-faint">/ 100</p>
            <p className={`text-[12px] font-medium leading-tight ${GRADE_STYLE[health.grade]}`}>
              {t(`health.grade.${health.grade}`)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onShowRules}
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-faint transition-colors hover:bg-elevated hover:text-fg"
        >
          <Info size={12} />
          {t('health.rules.title')}
        </button>
      </div>

      <p className="mt-2 text-[11.5px] leading-snug text-muted" data-testid="health-summary">
        {t('health.summary', {
          ok: health.counts.ok,
          warning: health.counts.warning,
          missing: health.counts.missing,
          unverified: health.counts.unverified,
        })}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
        {health.groups.map((g) => {
          const pct = groupPercent(g);
          return (
            <div key={g.group} className="min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-[11px] text-muted">{t(GROUP_LABEL[g.group])}</span>
                <span className="tnum shrink-0 text-[11px] font-medium text-fg">{pct}</span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${pct >= 90 ? 'bg-ok' : pct >= 60 ? 'bg-warn' : 'bg-err'}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {problems > 0 ? (
        <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-2.5 text-[11.5px] text-muted">
          <Gauge />
          <span>{t('health.problems', { n: problems })}</span>
        </div>
      ) : (
        <div className="mt-3 border-t border-line pt-2.5 text-[11.5px] text-muted">
          {t('health.noProblems')}
        </div>
      )}
    </div>
  );
}
