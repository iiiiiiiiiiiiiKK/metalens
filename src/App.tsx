import { useCallback, useMemo, useState } from 'react';
import { Download, ExternalLink, FileJson, ScanEye, Sparkles } from 'lucide-react';
import { AUTHOR_HANDLE, AUTHOR_URL, Header, REPO_URL } from './components/Header';
import { UrlBar } from './components/UrlBar';
import { HealthCard } from './components/HealthCard';
import { FindingsList } from './components/FindingsList';
import { PreviewPanel } from './components/PreviewPanel';
import { EditorPanel } from './components/EditorPanel';
import { CodePanel } from './components/CodePanel';
import { HistoryPanel } from './components/HistoryPanel';
import { SideNav } from './components/SideNav';
import type { NavItem } from './components/SideNav';
import { RulesDialog, SettingsDialog } from './components/Dialogs';
import { Button, Toast } from './components/ui';
import { useInspector } from './hooks/useInspector';
import { FIELDS } from './lib/fields';
import { problems } from './lib/analysis';
import { buildJsonReport, buildMarkdownReport, downloadFile } from './lib/report';
import type { Group, Status } from './lib/types';

const GROUP_STATE_GROUPS: Group[] = ['basic', 'og', 'twitter', 'image'];

export default function App() {
  const s = useInspector();
  const { t } = s;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusPath, setFocusPath] = useState<string | null>(null);

  const jumpToField = useCallback((path: string) => {
    const field = FIELDS.find((f) => f.path === path);
    const panel = document.getElementById('editor');
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFocusPath(path);
    if (field) {
      window.setTimeout(() => {
        document.getElementById(`field-${field.key}`)?.focus({ preventScroll: true });
      }, 280);
    }
    window.setTimeout(() => setFocusPath(null), 2400);
  }, []);

  const navItems = useMemo<NavItem[]>(() => {
    const problemCount = problems(s.findings).length;
    const statusFor = (group: Group): Status | undefined => {
      const list = s.findings.filter((f) => f.group === group && f.status !== 'ok');
      if (list.length === 0) return 'ok';
      if (list.some((f) => f.status === 'missing')) return 'missing';
      if (list.some((f) => f.status === 'warning')) return 'warning';
      return 'unverified';
    };
    const countFor = (group: Group): number =>
      s.findings.filter((f) => f.group === group && f.status !== 'ok').length;

    const items: NavItem[] = [
      {
        id: 'results',
        label: t('nav.results'),
        count: problemCount,
        status: problemCount ? 'warning' : 'ok',
      },
    ];
    if (s.findings.length > 0) {
      for (const group of GROUP_STATE_GROUPS) {
        items.push({
          id: `check-${group}`,
          label: t(`group.${group}`),
          status: statusFor(group),
          count: countFor(group),
        });
      }
    }
    items.push({ id: 'editor', label: t('nav.editor') });
    items.push({ id: 'code', label: t('nav.code') });
    items.push({ id: 'history', label: t('nav.history'), count: s.history.length });
    return items;
  }, [s.findings, s.history.length, t]);

  const ready = s.status === 'ready' && s.doc && s.report;

  const exportReport = useCallback(
    (kind: 'md' | 'json') => {
      if (!s.doc || !s.report) return;
      const input = {
        doc: s.doc,
        report: s.report,
        findings: s.findings,
        health: s.health,
        generated: s.generated,
        locale: s.locale,
        t,
        checkedAt: Date.now(),
      };
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      if (kind === 'md') {
        downloadFile(
          `metalens-report-${stamp}.md`,
          buildMarkdownReport(input),
          'text/markdown',
        );
      } else {
        downloadFile(
          `metalens-report-${stamp}.json`,
          buildJsonReport(input),
          'application/json',
        );
      }
      s.notify(t('report.exported'));
    },
    [s, t],
  );

  return (
    <div id="top" className="flex min-h-dvh flex-col">
      <Header
        t={t}
        locale={s.locale}
        theme={s.theme}
        onToggleLocale={s.toggleLocale}
        onToggleTheme={s.toggleTheme}
        onShowRules={() => setRulesOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-3 pb-10 pt-3 sm:px-5 sm:pt-4">
        <div className="mb-3 sm:mb-4">
          <UrlBar
            t={t}
            tab={s.tab}
            onTab={s.setTab}
            urlInput={s.urlInput}
            onUrlInput={s.setUrlInput}
            htmlInput={s.htmlInput}
            onHtmlInput={s.setHtmlInput}
            status={s.status}
            error={s.error}
            onInspectUrl={() => void s.inspectUrl()}
            onInspectHtml={() => s.inspectHtml()}
            onLoadSample={s.inspectSample}
            onStartManual={s.startManual}
            onOpenSettings={() => setSettingsOpen(true)}
            showResultTabs={Boolean(ready)}
          />
        </div>

        {!ready ? (
          <Hero t={t} onLoadSample={s.inspectSample} />
        ) : (
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[180px_minmax(0,1fr)_352px] lg:items-start lg:gap-5">
            <aside className="hidden lg:sticky lg:top-[68px] lg:block">
              <SideNav t={t} items={navItems} onOpenSettings={() => setSettingsOpen(true)} />
            </aside>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="lg:hidden">
                <SideNav
                  t={t}
                  items={navItems}
                  onOpenSettings={() => setSettingsOpen(true)}
                  variant="chips"
                  testId="mobile-nav"
                />
              </div>

              <HealthCard t={t} health={s.health} onShowRules={() => setRulesOpen(true)} />

              <FindingsList
                t={t}
                locale={s.locale}
                findings={s.findings}
                onJump={jumpToField}
              />

              {s.doc ? (
                <EditorPanel
                  t={t}
                  doc={s.rawDoc ?? s.doc}
                  onUpdate={s.updateField}
                  onReset={s.resetDoc}
                  isDirty={s.isDirty}
                  uploadedImage={s.uploadedImage}
                  onUpload={s.setUploadedImage}
                  focusPath={focusPath}
                />
              ) : null}

              <CodePanel
                t={t}
                code={s.generated}
                tags={s.tagList}
                options={s.codeOptions}
                onOptions={s.setCodeOptions}
                onDownload={() => {
                  downloadFile('metalens-meta-tags.html', s.generated, 'text/html');
                  s.notify(t('code.download'));
                }}
                onNotify={s.notify}
              />

              <HistoryPanel
                t={t}
                locale={s.locale}
                history={s.history}
                limit={s.historyLimit}
                onRemove={s.removeEntry}
                onClearAll={s.clearAllHistory}
                onReopen={s.reopenHistory}
              />
            </div>

            <aside className="order-first flex min-w-0 flex-col gap-3 lg:order-none lg:sticky lg:top-[68px]">
              <PreviewPanel
                t={t}
                platform={s.platform}
                onPlatform={s.setPlatform}
                variant={s.variant}
                onVariant={s.setVariant}
                previews={s.previews}
                probes={s.probes}
              />

              <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportReport('md')}
                  className="flex-1"
                >
                  <Download size={13} />
                  {t('report.markdown')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportReport('json')}
                  className="flex-1"
                >
                  <FileJson size={13} />
                  {t('report.json')}
                </Button>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer t={t} />

      <RulesDialog t={t} open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <SettingsDialog
        t={t}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={s.config}
        onSave={s.updateEndpoint}
        onNotify={s.notify}
      />

      {s.toastMessage ? (
        <Toast message={s.toastMessage.message} tone={s.toastMessage.tone} />
      ) : null}
    </div>
  );
}

function Hero({
  t,
  onLoadSample,
}: {
  t: (k: string) => string;
  onLoadSample: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface px-4 py-10 text-center sm:py-16">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-elevated text-accent">
        <ScanEye size={20} />
      </span>
      <h1 className="max-w-xl text-balance text-[22px] font-semibold leading-tight tracking-tight text-fg sm:text-[26px]">
        {t('empty.title')}
      </h1>
      <p className="mt-2 max-w-lg text-pretty text-[13px] leading-relaxed text-muted sm:text-[13.5px]">
        {t('empty.body')}
      </p>
      <ul className="mt-4 flex flex-col gap-1.5 text-left text-[12.5px] text-muted">
        {['empty.point1', 'empty.point2', 'empty.point3'].map((key) => (
          <li key={key} className="flex items-center gap-2">
            <span className="h-1 w-1 shrink-0 rounded-full bg-accent" />
            {t(key)}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button variant="primary" size="md" onClick={() => onLoadSample('complete')}>
          <Sparkles size={15} />
          {t('empty.trySample')}
        </Button>
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer me"
          className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-[12.5px] text-muted transition-colors hover:text-fg"
        >
          {AUTHOR_HANDLE}
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}

function Footer({ t }: { t: (k: string) => string }) {
  return (
    <footer className="border-t border-line px-3 py-4 sm:px-5">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-2 text-[11.5px] text-faint sm:flex-row">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span>{t('footer.built')}</span>
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noopener noreferrer me"
            className="font-medium text-muted hover:text-fg"
          >
            {AUTHOR_HANDLE}
          </a>
          <span className="text-line-strong">·</span>
          <span>{t('footer.local')}</span>
          <span className="text-line-strong">·</span>
          <a
            href={`${REPO_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg"
          >
            {t('footer.license')}
          </a>
        </p>
        <p className="flex items-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg"
          >
            GitHub
          </a>
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noopener noreferrer me"
            className="hover:text-fg"
            data-testid="footer-x-link"
          >
            X / {AUTHOR_HANDLE}
          </a>
        </p>
      </div>
    </footer>
  );
}
