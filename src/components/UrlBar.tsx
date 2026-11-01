import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  FileCode2,
  Link2,
  Loader2,
  PencilLine,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { Translator } from '../i18n';
import { SAMPLES } from '../lib/samples';
import type { InspectError, InspectStatus, InspectTab } from '../hooks/useInspector';
import { Button, Kbd, Segmented } from './ui';

export function UrlBar({
  t,
  tab,
  onTab,
  urlInput,
  onUrlInput,
  htmlInput,
  onHtmlInput,
  status,
  error,
  onInspectUrl,
  onInspectHtml,
  onLoadSample,
  onStartManual,
  onOpenSettings,
  showResultTabs,
}: {
  t: Translator;
  tab: InspectTab;
  onTab: (tab: InspectTab) => void;
  urlInput: string;
  onUrlInput: (value: string) => void;
  htmlInput: string;
  onHtmlInput: (value: string) => void;
  status: InspectStatus;
  error: InspectError | null;
  onInspectUrl: () => void;
  onInspectHtml: () => void;
  onLoadSample: (id: string) => void;
  onStartManual: () => void;
  onOpenSettings: () => void;
  showResultTabs: boolean;
}) {
  const loading = status === 'loading';

  const tabs = useMemo(
    () => [
      { value: 'url' as const, label: t('input.tab.url'), icon: <Link2 size={13} /> },
      { value: 'html' as const, label: t('input.tab.html'), icon: <FileCode2 size={13} /> },
      { value: 'manual' as const, label: t('input.tab.manual'), icon: <PencilLine size={13} /> },
      { value: 'sample' as const, label: t('input.tab.sample'), icon: <Sparkles size={13} /> },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-2.5">
      <Segmented
        items={tabs}
        value={tab}
        onChange={onTab}
        ariaLabel={t('nav.overview')}
        scroll
        size="sm"
      />

      {tab === 'url' ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            onInspectUrl();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Link2
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
              aria-hidden
            />
            <input
              id="url-input"
              name="url"
              type="url"
              inputMode="url"
              enterKeyHint="go"
              autoComplete="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label={t('input.urlLabel')}
              placeholder={t('input.urlPlaceholder')}
              value={urlInput}
              onChange={(e) => onUrlInput(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-[16px] text-fg placeholder:text-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-[14px]"
            />
          </div>
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            className="h-11 shrink-0 px-5 sm:w-auto"
            data-testid="inspect-url"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {loading ? t('input.checking') : t('input.check')}
          </Button>
        </form>
      ) : null}

      {tab === 'html' ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="html-input" className="sr-only">
            {t('input.htmlLabel')}
          </label>
          <textarea
            id="html-input"
            value={htmlInput}
            onChange={(e) => onHtmlInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onInspectHtml();
            }}
            placeholder={t('input.htmlPlaceholder')}
            spellCheck={false}
            rows={8}
            className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 font-mono text-[16px] leading-relaxed text-fg placeholder:text-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-[12.5px]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={onInspectHtml} data-testid="inspect-html">
              {t('input.htmlAnalyze')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onHtmlInput('')}
              disabled={!htmlInput}
            >
              <Trash2 size={13} />
              {t('input.clear')}
            </Button>
            <span className="ml-auto flex items-center gap-2 text-[11px] text-faint">
              <span className="tnum">{t('input.charCount', { n: htmlInput.length })}</span>
              <span className="hidden items-center gap-1 sm:flex">
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd>
              </span>
            </span>
          </div>
        </div>
      ) : null}

      {tab === 'manual' ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-3 py-3">
          <p className="text-[12.5px] leading-relaxed text-muted">{t('input.manualHelp')}</p>
          <Button variant="secondary" size="sm" onClick={onStartManual} className="w-fit">
            <PencilLine size={13} />
            {t('input.manualStart')}
          </Button>
        </div>
      ) : null}

      {tab === 'sample' ? (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] text-muted">{t('input.sampleHelp')}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {SAMPLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onLoadSample(sample.id)}
                data-testid={`load-sample-${sample.id}`}
                className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-elevated"
              >
                <span className="text-[12.5px] font-medium text-fg">{t(sample.labelKey)}</span>
                <span className="text-[11.5px] leading-snug text-muted">
                  {t(sample.descriptionKey)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <ErrorBlock t={t} error={error} onTab={onTab} onOpenSettings={onOpenSettings} />
      ) : null}

      {!showResultTabs && !error && tab === 'url' ? (
        <p className="hidden text-[11px] text-faint sm:block">{t('app.privacy')}</p>
      ) : null}
    </div>
  );
}

function ErrorBlock({
  t,
  error,
  onTab,
  onOpenSettings,
}: {
  t: Translator;
  error: InspectError;
  onTab: (tab: InspectTab) => void;
  onOpenSettings: () => void;
}) {
  const message = t(error.code, { detail: error.detail ?? '' });
  const code = error.code.replace('error.', '');

  return (
    <div
      role="alert"
      data-testid="inspect-error"
      className="rounded-xl border border-err/30 bg-err/8 px-3.5 py-3"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-err" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-fg">{t('error.title')}</p>
          <p className="mt-0.5 break-words text-[12.5px] leading-relaxed text-muted">{message}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
            {t('error.whatNow')}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            <ActionRow
              label={t('error.action.paste')}
              help={t('error.action.pasteHelp')}
              onClick={() => onTab('html')}
            />
            <ActionRow
              label={t('error.action.manual')}
              help={t('error.action.manualHelp')}
              onClick={() => onTab('manual')}
            />
            <ActionRow
              label={t('error.action.endpoint')}
              help={t('error.action.endpointHelp')}
              onClick={onOpenSettings}
              recommended={code === 'cors'}
            />
          </ul>
        </div>
      </div>
    </div>
  );
}

function ActionRow({
  label,
  help,
  onClick,
  recommended,
}: {
  label: string;
  help: string;
  onClick: () => void;
  recommended?: boolean;
}) {
  return (
    <li className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={onClick}
        className="flex w-fit items-center gap-1 text-left text-[12.5px] font-medium text-accent hover:underline"
      >
        <ArrowRight size={12} />
        {label}
        {recommended ? (
          <span className="ml-1 rounded bg-accent/15 px-1 py-px text-[10px] font-semibold text-accent">
            ★
          </span>
        ) : null}
      </button>
      <span className="pl-[18px] text-[11.5px] leading-relaxed text-faint">{help}</span>
    </li>
  );
}
