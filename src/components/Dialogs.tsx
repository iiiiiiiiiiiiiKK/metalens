import { useState } from 'react';
import type { Translator } from '../i18n';
import { isValidEndpoint } from '../lib/config';
import type { RuntimeConfig } from '../lib/config';
import { Button, Dialog } from './ui';

export function RulesDialog({
  t,
  open,
  onClose,
}: {
  t: Translator;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={t('health.rules.title')}>
      <div className="flex flex-col gap-3">
        <p className="rounded-lg border border-line bg-surface px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-fg">
          {t('health.rules.formula')}
        </p>
        <p>{t('health.rules.credit')}</p>
        <p>{t('health.rules.weights')}</p>
        <p className="rounded-lg bg-warn/10 px-2.5 py-2 text-[12px] leading-relaxed text-warn">
          {t('health.rules.caveat')}
        </p>
        <p className="text-[12px] leading-relaxed text-faint">{t('app.disclaimer')}</p>
      </div>
    </Dialog>
  );
}

export function SettingsDialog({
  t,
  open,
  onClose,
  config,
  onSave,
  onNotify,
}: {
  t: Translator;
  open: boolean;
  onClose: () => void;
  config: RuntimeConfig;
  onSave: (endpoint: string) => void;
  onNotify: (message: string, tone?: 'ok' | 'err') => void;
}) {
  const [draft, setDraft] = useState(config.fetchEndpoint);
  const [error, setError] = useState('');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('settings.title')}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft('');
              setError('');
              onSave('');
              onNotify(t('settings.saved'));
            }}
          >
            {t('settings.reset')}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!isValidEndpoint(draft)) {
                  setError(t('settings.invalid'));
                  return;
                }
                setError('');
                onSave(draft.trim());
                onNotify(t('settings.saved'));
                onClose();
              }}
            >
              {t('settings.save')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-2.5">
        <p>{t('settings.subtitle')}</p>
        <label htmlFor="endpoint-input" className="text-[12px] font-medium text-fg">
          {t('settings.endpoint')}
        </label>
        <input
          id="endpoint-input"
          type="url"
          inputMode="url"
          spellCheck={false}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('settings.endpointPlaceholder')}
          className="h-10 w-full rounded-lg border border-line bg-surface px-2.5 font-mono text-[16px] text-fg placeholder:text-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-[12.5px]"
        />
        {error ? <p className="text-[12px] text-err">{error}</p> : null}
        <p className="text-[12px] leading-relaxed text-faint">{t('settings.endpointHelp')}</p>
        <div className="rounded-lg border border-line bg-surface px-2.5 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
            {t('settings.active')}
          </p>
          <p className="mt-0.5 break-all font-mono text-[11.5px] text-fg">
            {config.fetchEndpoint || t('settings.none')}
          </p>
        </div>
      </div>
    </Dialog>
  );
}
