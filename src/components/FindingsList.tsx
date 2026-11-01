import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, HelpCircle, Lightbulb, Pencil } from 'lucide-react';
import type { Translator } from '../i18n';
import { hasTranslation } from '../i18n';
import type { Locale } from '../lib/types';
import { groupFindings, problems } from '../lib/analysis';
import type { Finding, Group, Status } from '../lib/types';
import { Empty, Panel, PanelHeader, Segmented, StatusBadge, Button } from './ui';

const GROUP_KEYS: Array<{ group: Group; label: string }> = [
  { group: 'basic', label: 'group.basic' },
  { group: 'og', label: 'group.og' },
  { group: 'twitter', label: 'group.twitter' },
  { group: 'image', label: 'group.image' },
];

const STATUS_ICON = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  missing: CircleDashed,
  unverified: HelpCircle,
} as const;

export type FindingFilter = 'all' | 'problems' | Status;

export function FindingsList({
  t,
  locale,
  findings,
  onJump,
}: {
  t: Translator;
  locale: Locale;
  findings: Finding[];
  onJump: (path: string) => void;
}) {
  const [filter, setFilter] = useState<FindingFilter>('all');

  const visible = useMemo(() => {
    if (filter === 'all') return findings;
    if (filter === 'problems') return problems(findings);
    return findings.filter((f) => f.status === filter);
  }, [findings, filter]);

  const grouped = useMemo(() => groupFindings(visible), [visible]);
  const problemCount = problems(findings).length;

  const filterItems: Array<{ value: FindingFilter; label: string; badge?: React.ReactNode }> = [
    { value: 'all', label: t('status.all'), badge: <span className="tnum text-[10px] text-faint">{findings.length}</span> },
    { value: 'problems', label: t('nav.results'), badge: <span className="tnum text-[10px] text-faint">{problemCount}</span> },
    { value: 'missing', label: t('status.missing') },
    { value: 'warning', label: t('status.warning') },
    { value: 'unverified', label: t('status.unverified') },
  ];

  return (
    <Panel id="results">
      <PanelHeader
        title={t('nav.results')}
        subtitle={t('health.checks', { n: findings.length })}
      />
      <div className="px-3.5 pb-1 pt-2.5 sm:px-4">
        <Segmented
          items={filterItems}
          value={filter}
          onChange={setFilter}
          ariaLabel={t('nav.results')}
          scroll
          size="sm"
        />
      </div>

      {visible.length === 0 ? (
        <Empty title={t('health.noProblems')} />
      ) : (
        <div className="divide-y divide-line">
          {GROUP_KEYS.map(({ group, label }) => {
            const items = grouped[group] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={group} id={`check-${group}`} className="px-3.5 py-2.5 sm:px-4">
                <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  {t(label)}
                  <span className="tnum rounded bg-elevated px-1 text-[10px] font-medium text-muted">
                    {items.length}
                  </span>
                </h3>
                <ul className="flex flex-col gap-1">
                  {items.map((f) => (
                    <FindingRow key={f.id} finding={f} t={t} locale={locale} onJump={onJump} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function FindingRow({
  finding,
  t,
  locale,
  onJump,
}: {
  finding: Finding;
  t: Translator;
  locale: Locale;
  onJump: (path: string) => void;
}) {
  const Icon = STATUS_ICON[finding.status];
  const message = t(`issue.${finding.code}`, finding.params);
  const fixKey = `fix.field.${finding.field}`;
  const fix = hasTranslation(locale, fixKey) ? t(fixKey) : '';
  const editable = finding.status !== 'ok' && finding.group !== 'image';

  return (
    <li
      data-testid={`finding-${finding.id}`}
      className="group rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-line hover:bg-elevated/60"
    >
      <div className="flex items-start gap-2">
        <Icon
          size={13}
          className={`mt-0.5 shrink-0 ${
            finding.status === 'ok'
              ? 'text-ok'
              : finding.status === 'warning'
                ? 'text-warn'
                : finding.status === 'missing'
                  ? 'text-err'
                  : 'text-unknown'
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <code className="font-mono text-[12px] font-medium text-fg">{finding.field}</code>
            <StatusBadge status={finding.status} label={t(`status.${finding.status}`)} />
            {editable ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onJump(finding.path)}
                className="ml-auto h-6 px-1.5 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <Pencil size={11} />
                {t('editor.jump')}
              </Button>
            ) : null}
          </div>
          <p className="mt-0.5 break-words text-[12.5px] leading-relaxed text-muted">{message}</p>
          {finding.value && finding.status !== 'ok' ? (
            <p className="mt-1 break-all rounded border border-line bg-bg px-1.5 py-1 font-mono text-[11px] leading-relaxed text-faint">
              {finding.value.length > 220 ? `${finding.value.slice(0, 220)}…` : finding.value}
            </p>
          ) : null}
          {fix && finding.status !== 'ok' ? (
            <p className="mt-1 flex items-start gap-1 text-[11.5px] leading-relaxed text-accent/90">
              <Lightbulb size={11} className="mt-0.5 shrink-0" />
              <span>{fix}</span>
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
