import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyze } from '../lib/analysis';
import { DEFAULT_CODEGEN_OPTIONS, generateMetaTags, generateTagList } from '../lib/codegen';
import type { CodegenOptions } from '../lib/codegen';
import { EMPTY_CONFIG, loadRuntimeConfig, saveFetchEndpoint } from '../lib/config';
import type { RuntimeConfig } from '../lib/config';
import { emptyDoc, FIELD_BY_KEY, getByPath, setByPath } from '../lib/fields';
import { fetchPageHtml } from '../lib/fetchPage';
import { computeHealth } from '../lib/health';
import {
  addHistoryEntry,
  clearHistory,
  historyStatus,
  HISTORY_LIMIT,
  loadHistory,
  removeHistoryEntry,
  saveHistory,
} from '../lib/history';
import { probeImage } from '../lib/images';
import { parseHtml } from '../lib/parse';
import { buildPreview } from '../lib/preview';
import { getSample } from '../lib/samples';
import { readString, writeString } from '../lib/storage';
import type {
  HistoryEntry,
  ImageProbe,
  Locale,
  MetaDoc,
  ParseResult,
  Platform,
  SourceMode,
  Theme,
} from '../lib/types';
import { PLATFORMS } from '../lib/preview';
import { resolveUrl } from '../lib/url';
import { translate } from '../i18n';
import type { Translator } from '../i18n';

export type InspectTab = 'url' | 'html' | 'manual' | 'sample';
export type InspectStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface InspectError {
  code: string;
  detail?: string;
}

const LOCALE_KEY = 'metalens.locale.v1';
const THEME_KEY = 'metalens.theme.v1';

function initialLocale(): Locale {
  const stored = readString(LOCALE_KEY);
  if (stored === 'en' || stored === 'zh') return stored;
  if (typeof navigator !== 'undefined' && /^zh/i.test(navigator.language ?? '')) return 'zh';
  return 'en';
}

function initialTheme(): Theme {
  const stored = readString(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches
  ) {
    return 'light';
  }
  return 'dark';
}

export function blankResult(mode: SourceMode, url = ''): ParseResult {
  return {
    doc: emptyDoc(url),
    report: {
      mode,
      baseHref: '',
      duplicates: {},
      emptyKeys: [],
      foundKeys: [],
      other: [],
      titleCount: 0,
      truncated: false,
      parsed: false,
    },
  };
}

export function useInspector() {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [tab, setTab] = useState<InspectTab>('url');
  const [urlInput, setUrlInput] = useState('');
  const [htmlInput, setHtmlInput] = useState('');
  const [status, setStatus] = useState<InspectStatus>('idle');
  const [error, setError] = useState<InspectError | null>(null);
  const [original, setOriginal] = useState<ParseResult | null>(null);
  const [doc, setDoc] = useState<MetaDoc | null>(null);
  const [probes, setProbes] = useState<Record<string, ImageProbe>>({});
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [config, setConfig] = useState<RuntimeConfig>(EMPTY_CONFIG);
  const [codeOptions, setCodeOptions] = useState<CodegenOptions>(DEFAULT_CODEGEN_OPTIONS);
  const [platform, setPlatform] = useState<Platform>('x');
  const [variant, setVariant] = useState<'auto' | 'large' | 'small' | 'none'>('auto');
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    tone: 'ok' | 'err';
    id: number;
  } | null>(null);
  const currentEntryId = useRef<string | null>(null);
  const probing = useRef<Set<string>>(new Set());
  const historyLoaded = useRef(false);

  const t: Translator = useCallback((key, params) => translate(locale, key, params), [locale]);

  /* ------------------------------------------------------------ preferences */

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeString(LOCALE_KEY, next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'en' ? 'zh' : 'en');
  }, [locale, setLocale]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeString(THEME_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    loadRuntimeConfig().then((cfg) => {
      if (!cancelled) setConfig(cfg);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!historyLoaded.current) {
      historyLoaded.current = true;
      return;
    }
    saveHistory(history);
  }, [history]);

  /* ---------------------------------------------------------------- toast -- */

  const notify = useCallback((message: string, tone: 'ok' | 'err' = 'ok') => {
    setToastMessage({ message, tone, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  /* ------------------------------------------------------------- committing */

  const commit = useCallback((result: ParseResult, entryUrl: string) => {
    setOriginal(result);
    setDoc(result.doc);
    setProbes({});
    setUploadedImage(null);
    probing.current.clear();
    setError(null);
    setStatus('ready');

    const findings = analyze(result.doc, result.report, []);
    const health = computeHealth(findings);
    const title = result.doc.title || result.doc.og.title || entryUrl;
    const entry = {
      url: entryUrl,
      title,
      mode: result.report.mode,
      score: health.score,
    };
    setHistory((prev) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      currentEntryId.current = id;
      return addHistoryEntry(prev, { ...entry, id, now: Date.now() });
    });
  }, []);

  /* -------------------------------------------------------------- inspecting */

  const inspectUrl = useCallback(
    async (rawUrl?: string) => {
      const value = (rawUrl ?? urlInput).trim();
      setStatus('loading');
      setError(null);
      const result = await fetchPageHtml(value, config.fetchEndpoint || null);
      if (!result.ok) {
        setStatus('error');
        setError({ code: `error.${result.code}`, detail: result.detail });
        return;
      }
      const parsed = parseHtml(result.html, {
        sourceUrl: result.finalUrl,
        mode: 'url',
        truncated: result.truncated,
      });
      setUrlInput(result.finalUrl);
      commit(parsed, result.finalUrl);
    },
    [commit, config.fetchEndpoint, urlInput],
  );

  const inspectHtml = useCallback(
    (html?: string, sourceUrl = '') => {
      const value = html ?? htmlInput;
      const parsed = parseHtml(value, { sourceUrl, mode: 'html' });
      commit(
        parsed,
        sourceUrl || parsed.doc.canonical || parsed.doc.og.url || 'about:html-input',
      );
    },
    [commit, htmlInput],
  );

  const inspectSample = useCallback(
    (id: string) => {
      const sample = getSample(id);
      if (!sample) return;
      const parsed = parseHtml(sample.html, { sourceUrl: sample.url, mode: 'sample' });
      setHtmlInput(sample.html);
      commit(parsed, sample.url);
    },
    [commit],
  );

  const startManual = useCallback(() => {
    setTab('manual');
    commit(blankResult('manual'), '');
  }, [commit]);

  const resetDoc = useCallback(() => {
    if (!original) return;
    setDoc(original.doc);
    setUploadedImage(null);
    notify(t('editor.resetDone'));
  }, [original, t, notify]);

  /* ---------------------------------------------------------------- editing */

  const updateField = useCallback((path: string, value: string) => {
    setDoc((prev) => (prev ? setByPath(prev, path, value) : prev));
  }, []);

  /* ------------------------------------------------------------- history --- */

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => removeHistoryEntry(prev, id));
  }, []);

  const clearAllHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
    currentEntryId.current = null;
  }, []);

  const reopenHistory = useCallback(
    (entry: HistoryEntry) => {
      if (entry.mode === 'sample') {
        const sample = getSample('complete');
        if (sample) {
          inspectSample('complete');
          return;
        }
      }
      if (entry.mode === 'url' && entry.url) {
        setTab('url');
        setUrlInput(entry.url);
        void inspectUrl(entry.url);
        return;
      }
      void inspectUrl(entry.url);
    },
    [inspectSample, inspectUrl],
  );

  /* -------------------------------------------------------------- settings -- */

  const updateEndpoint = useCallback((endpoint: string) => {
    saveFetchEndpoint(endpoint);
    setConfig((prev) => ({ ...prev, fetchEndpoint: endpoint.trim() }));
  }, []);

  /* --------------------------------------------------------------- derived -- */

  const report = original?.report ?? null;

  const effectiveDoc = useMemo<MetaDoc | null>(() => {
    if (!doc) return null;
    if (!uploadedImage) return doc;
    return { ...doc, og: { ...doc.og, image: uploadedImage } };
  }, [doc, uploadedImage]);

  const imageUrls = useMemo<string[]>(() => {
    if (!effectiveDoc) return [];
    const urls = new Set<string>();
    for (const key of ['og:image', 'twitter:image']) {
      const field = FIELD_BY_KEY[key];
      const raw = getByPath(effectiveDoc, field.path).trim();
      const abs = resolveUrl(raw, effectiveDoc.sourceUrl);
      if (abs) urls.add(abs);
    }
    return [...urls];
  }, [effectiveDoc]);

  useEffect(() => {
    for (const url of imageUrls) {
      if (probing.current.has(url)) continue;
      const existing = probes[url];
      if (existing && existing.status !== 'idle') continue;
      probing.current.add(url);
      probeImage(url, 6000).then((probe) => {
        setProbes((prev) => ({ ...prev, [url]: probe }));
      });
    }
  }, [imageUrls, probes]);

  const findings = useMemo(() => {
    if (!effectiveDoc || !report) return [];
    return analyze(effectiveDoc, report, Object.values(probes));
  }, [effectiveDoc, report, probes]);

  const health = useMemo(() => computeHealth(findings), [findings]);

  const previews = useMemo(() => {
    if (!effectiveDoc) return null;
    const out = {} as Record<Platform, ReturnType<typeof buildPreview>>;
    for (const p of PLATFORMS) {
      out[p] = buildPreview(effectiveDoc, p, variant === 'auto' ? undefined : variant);
    }
    return out;
  }, [effectiveDoc, variant]);

  const generated = useMemo(
    () => (doc ? generateMetaTags(doc, codeOptions) : ''),
    [doc, codeOptions],
  );

  const tagList = useMemo(
    () => (doc ? generateTagList(doc, codeOptions) : []),
    [doc, codeOptions],
  );

  useEffect(() => {
    const id = currentEntryId.current;
    if (!id || status !== 'ready') return;
    setHistory((prev) => {
      let changed = false;
      const next = prev.map((e) => {
        if (e.id !== id) return e;
        if (e.score === health.score) return e;
        changed = true;
        return { ...e, score: health.score, status: historyStatus(health.score) };
      });
      return changed ? next : prev;
    });
  }, [health.score, status]);

  const isDirty = useMemo(() => {
    if (!doc || !original) return false;
    return JSON.stringify(doc) !== JSON.stringify(original.doc);
  }, [doc, original]);

  return {
    // preferences
    locale,
    setLocale,
    toggleLocale,
    theme,
    toggleTheme,
    t,
    // input
    tab,
    setTab,
    urlInput,
    setUrlInput,
    htmlInput,
    setHtmlInput,
    status,
    error,
    // documents
    doc: effectiveDoc,
    rawDoc: doc,
    original,
    report,
    // results
    findings,
    health,
    previews,
    generated,
    tagList,
    codeOptions,
    setCodeOptions,
    probes,
    // preview controls
    platform,
    setPlatform,
    variant,
    setVariant,
    // history
    history,
    removeEntry,
    clearAllHistory,
    reopenHistory,
    historyLimit: HISTORY_LIMIT,
    // settings
    config,
    updateEndpoint,
    // actions
    inspectUrl,
    inspectHtml,
    inspectSample,
    startManual,
    resetDoc,
    updateField,
    uploadedImage,
    setUploadedImage,
    isDirty,
    // misc
    notify,
    toastMessage,
  };
}
