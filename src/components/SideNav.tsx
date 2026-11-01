import { ChevronRight, Settings2 } from 'lucide-react';
import type { Translator } from '../i18n';
import type { Status } from '../lib/types';
import { StatusDot } from './ui';

export interface NavItem {
  id: string;
  label: string;
  status?: Status;
  count?: number;
}

export function SideNav({
  t,
  items,
  onOpenSettings,
  variant = 'sidebar',
  testId,
}: {
  t: Translator;
  items: NavItem[];
  onOpenSettings: () => void;
  variant?: 'sidebar' | 'chips';
  testId?: string;
}) {
  if (variant === 'chips') {
    return (
      <nav
        aria-label={t('nav.jump')}
        data-testid={testId}
        className="scroll-x -mx-1 flex w-full min-w-0 items-center gap-1 px-1 py-1"
      >
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 text-[11.5px] text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            {item.status ? <StatusDot status={item.status} /> : null}
            {item.label}
            {typeof item.count === 'number' ? (
              <span className="tnum text-[10px] text-faint">{item.count}</span>
            ) : null}
          </a>
        ))}
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 text-[11.5px] text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <Settings2 size={11} />
          {t('nav.settings')}
        </button>
      </nav>
    );
  }

  return (
    <nav aria-label={t('nav.jump')} className="flex flex-col gap-0.5">
      <p className="px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
        {t('nav.jump')}
      </p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-elevated hover:text-fg"
        >
          {item.status ? <StatusDot status={item.status} /> : <span className="w-1.5" />}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {typeof item.count === 'number' ? (
            <span className="tnum text-[10.5px] text-faint">{item.count}</span>
          ) : null}
          <ChevronRight
            size={12}
            className="shrink-0 text-transparent transition-colors group-hover:text-faint"
          />
        </a>
      ))}
      <button
        type="button"
        onClick={onOpenSettings}
        className="mt-1 flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-elevated hover:text-fg"
      >
        <Settings2 size={12} />
        <span className="flex-1 truncate text-left">{t('nav.settings')}</span>
      </button>
    </nav>
  );
}
