import { Github, HelpCircle, Languages, Moon, ScanEye, Settings2, Sun } from 'lucide-react';
import type { Locale, Theme } from '../lib/types';
import type { Translator } from '../i18n';
import { Button } from './ui';

export const AUTHOR_HANDLE = '@0xkillcoin';
export const AUTHOR_URL = 'https://x.com/0xkillcoin';
export const REPO_URL = 'https://github.com/iiiiiiiiiiiiiKK/metalens';

/** The X logo, rendered inline so no third-party asset is loaded. */
function XMark({ size = 15 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Header({
  t,
  locale,
  theme,
  onToggleLocale,
  onToggleTheme,
  onShowRules,
  onOpenSettings,
}: {
  t: Translator;
  locale: Locale;
  theme: Theme;
  onToggleLocale: () => void;
  onToggleTheme: () => void;
  onShowRules: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-2 px-3 sm:px-5">
        <a
          href="#top"
          className="flex min-w-0 shrink items-center gap-2 text-fg no-underline"
          aria-label="MetaLens"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-elevated text-accent">
            <ScanEye size={17} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold leading-tight tracking-tight">
              {t('app.name')}
            </span>
            <span className="hidden truncate text-[10.5px] leading-tight text-muted xs:block sm:block">
              {t('app.tagline')}
            </span>
          </span>
        </a>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {/* Author credit — required link to the author's X profile. */}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noopener noreferrer me"
            data-testid="author-x-link"
            aria-label={`${t('header.author')} ${AUTHOR_HANDLE}`}
            title={`${t('header.author')} · ${AUTHOR_HANDLE}`}
            className="group inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-elevated px-2.5 text-fg transition-colors hover:border-line-strong hover:bg-line"
          >
            <XMark size={13} />
            <span className="hidden text-[12px] font-medium sm:inline">{AUTHOR_HANDLE}</span>
            <span className="sr-only">{AUTHOR_HANDLE}</span>
          </a>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('header.github')}
            title={t('header.github')}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-fg xs:flex sm:flex"
          >
            <Github size={16} />
          </a>

          <Button
            variant="ghost"
            size="icon"
            onClick={onShowRules}
            aria-label={t('header.help')}
            title={t('header.help')}
            className="h-9 w-9"
          >
            <HelpCircle size={16} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
            className="h-9 w-9"
            data-testid="open-settings"
          >
            <Settings2 size={16} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            aria-label={t('header.theme')}
            title={t('header.theme')}
            className="h-9 w-9"
            data-testid="theme-toggle"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleLocale}
            aria-label={t('header.language')}
            title={t('header.language')}
            className="h-9 w-9 sm:w-auto sm:px-2"
            data-testid="locale-toggle"
          >
            <Languages size={16} />
            <span className="hidden text-[12px] font-medium sm:inline">
              {locale === 'en' ? 'EN' : '中文'}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
