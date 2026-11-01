import { useState } from 'react';
import { Clock, History, Trash2, Undo2 } from 'lucide-react';
import type { Translator } from '../i18n';
import type { HistoryEntry, Locale } from '../lib/types';
import { Button, Dialog, Empty, Panel, PanelHeader } from './ui';

export function HistoryPanel({
  t,
  locale,
  history,
  limit,
  onRemove,
  onClearAll,
  onReopen,
  id = 'history',
}: {
  t: Translator;
  locale: Locale;
  history: HistoryEntry[];
  limit: number;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onReopen: (entry: HistoryEntry) => void;
  id?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const formatter = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Panel id={id}>
      <PanelHeader
        title={t('history.title')}
        subtitle={t('history.subtitle')}
        right={
          <>
            <span className="tnum hidden text-[10.5px] text-faint sm:inline">
              {t('history.count', { n: history.length, max: limit })}
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={history.length === 0}
              aria-label={t('history.clear')}
              title={t('history.clear')}
            >
              <Trash2 size={12} />
            </Button>
          </>
        }
      />

      {history.length === 0 ? (
        <Empty icon={<History size={20} />} title={t('history.empty')} />
      ) : (
        <ul className="divide-y divide-line" data-testid="history-list">
          {history.map((entry) => (
            <li key={entry.id} className="group flex items-center gap-2 px-3.5 py-2 sm:px-4">
              <span
                className={`tnum flex h-7 w-9 shrink-0 items-center justify-center rounded border text-[11px] font-semibold ${
                  entry.status === 'ok'
                    ? 'border-ok/30 bg-ok/10 text-ok'
                    : entry.status === 'warn'
                      ? 'border-warn/30 bg-warn/10 text-warn'
                      : 'border-err/30 bg-err/10 text-err'
                }`}
              >
                {entry.score}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-fg">
                  {entry.title || entry.url || t('common.unknown')}
                </p>
                <p className="flex items-center gap-1.5 truncate text-[11px] text-faint">
                  <span className="rounded bg-elevated px-1 font-mono text-[10px]">
                    {t(`history.mode.${entry.mode}`)}
                  </span>
                  <span className="truncate">{entry.url || '—'}</span>
                </p>
              </div>
              <span className="hidden shrink-0 items-center gap-1 text-[10.5px] text-faint sm:flex">
                <Clock size={10} />
                {formatter.format(new Date(entry.checkedAt))}
              </span>
              <div className="flex shrink-0 items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReopen(entry)}
                  aria-label={t('history.open')}
                  title={t('history.open')}
                  className="h-7 w-7 px-0"
                >
                  <Undo2 size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(entry.id)}
                  aria-label={t('history.remove')}
                  title={t('history.remove')}
                  className="h-7 w-7 px-0 hover:text-err"
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('history.clear')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClearAll();
                setConfirmOpen(false);
              }}
            >
              {t('common.delete')}
            </Button>
          </div>
        }
      >
        {t('history.clearConfirm', { n: history.length })}
      </Dialog>
    </Panel>
  );
}
