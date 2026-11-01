import { Check, Code2, Download, Copy } from 'lucide-react';
import type { Translator } from '../i18n';
import type { CodegenOptions } from '../lib/codegen';
import type { GeneratedTag } from '../lib/codegen';
import { Button, CopyButton, Panel, PanelHeader, useCopy } from './ui';

const OPTION_KEYS: Array<{ key: keyof CodegenOptions; label: string }> = [
  { key: 'includeTitle', label: 'code.option.title' },
  { key: 'includeDescription', label: 'code.option.description' },
  { key: 'includeCanonical', label: 'code.option.canonical' },
  { key: 'includeRobots', label: 'code.option.robots' },
  { key: 'includeViewport', label: 'code.option.viewport' },
  { key: 'includeOg', label: 'code.option.og' },
  { key: 'includeTwitter', label: 'code.option.twitter' },
];

export function CodePanel({
  t,
  code,
  tags,
  options,
  onOptions,
  onDownload,
  onNotify,
  id = 'code',
}: {
  t: Translator;
  code: string;
  tags: GeneratedTag[];
  options: CodegenOptions;
  onOptions: (next: CodegenOptions) => void;
  onDownload: () => void;
  onNotify: (message: string, tone?: 'ok' | 'err') => void;
  id?: string;
}) {
  const { copy, copied } = useCopy();

  return (
    <Panel id={id}>
      <PanelHeader
        title={t('code.title')}
        subtitle={t('code.subtitle')}
        right={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              disabled={!code}
              title={t('code.download')}
              className="hidden sm:inline-flex"
            >
              <Download size={13} />
            </Button>
            <CopyButton
              text={code}
              label={t('code.copy')}
              copiedLabel={t('code.copied')}
              onCopied={(ok) =>
                onNotify(ok ? t('code.copied') : t('error.endpointError'), ok ? 'ok' : 'err')
              }
            />
          </>
        }
      />

      <div className="flex flex-wrap gap-1 border-b border-line px-3.5 py-2 sm:px-4">
        <span className="mr-1 self-center text-[11px] text-faint">{t('code.options')}</span>
        {OPTION_KEYS.map(({ key, label }) => {
          const active = options[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onOptions({ ...options, [key]: !active })}
              className={`inline-flex h-6 items-center gap-1 rounded border px-1.5 font-mono text-[10.5px] transition-colors ${
                active
                  ? 'border-accent/40 bg-accent/12 text-accent'
                  : 'border-line bg-bg text-faint hover:text-fg'
              }`}
            >
              {active ? <Check size={10} /> : null}
              {t(label)}
            </button>
          );
        })}
      </div>

      {code ? (
        <div className="max-h-[320px] overflow-auto">
          <pre
            data-testid="generated-code"
            className="min-w-0 whitespace-pre-wrap break-words px-3.5 py-3 font-mono text-[11.5px] leading-relaxed text-fg/90 sm:px-4"
          >
            <code>{code}</code>
          </pre>
        </div>
      ) : (
        <p className="px-3.5 py-6 text-center text-[12.5px] text-muted sm:px-4">
          {t('code.empty')}
        </p>
      )}

      {tags.length > 0 ? (
        <details className="border-t border-line">
          <summary className="cursor-pointer select-none px-3.5 py-2 text-[11.5px] text-muted hover:text-fg sm:px-4">
            {t('code.tags', { n: tags.length })}
          </summary>
          <ul className="divide-y divide-line">
            {tags.map((tag) => (
              <li key={tag.key} className="flex items-start gap-2 px-3.5 py-1.5 sm:px-4">
                <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-faint">
                  {tag.tag}
                </code>
                <button
                  type="button"
                  aria-label={t('code.copyOne')}
                  title={t('code.copyOne')}
                  onClick={() => {
                    void copy(tag.tag, tag.key).then((ok) =>
                      onNotify(
                        ok ? t('code.copied') : t('error.endpointError'),
                        ok ? 'ok' : 'err',
                      ),
                    );
                  }}
                  className="shrink-0 rounded p-1 text-faint transition-colors hover:bg-elevated hover:text-fg"
                >
                  {copied === tag.key ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="flex items-center gap-1.5 border-t border-line px-3.5 py-2 text-[11px] text-faint sm:px-4">
        <Code2 size={11} />
        <span className="truncate">{t('app.privacy')}</span>
      </div>
    </Panel>
  );
}
