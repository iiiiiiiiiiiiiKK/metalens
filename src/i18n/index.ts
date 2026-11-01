import type { Locale } from '../lib/types';

export type Dict = Record<string, string>;
export type Params = Record<string, string | number>;

import en from './en';
import zh from './zh';

const DICTS: Record<Locale, Dict> = { en, zh };

export const LOCALES: Locale[] = ['en', 'zh'];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  zh: '中文',
};

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function hasTranslation(locale: Locale, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(DICTS[locale], key);
}

/** Looks a key up and interpolates `{param}` placeholders. */
export function translate(locale: Locale, key: string, params?: Params): string {
  const dict = DICTS[locale] ?? en;
  const template = dict[key] ?? en[key];
  if (template === undefined) return key;
  return interpolate(template, params);
}

export type Translator = (key: string, params?: Params) => string;

export function createTranslator(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params);
}

export { en, zh };
