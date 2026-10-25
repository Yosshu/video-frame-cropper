import { en } from './en';
import { ja, type MessageKey } from './ja';

export type { MessageKey };
export type Lang = 'ja' | 'en';
export type MessageParams = Record<string, string | number>;

export const LANGS: readonly Lang[] = ['ja', 'en'];

const dictionaries: Record<Lang, Record<MessageKey, string>> = { ja, en };
const STORAGE_KEY = 'vfc.lang';

let current: Lang = 'ja';
const listeners = new Set<(lang: Lang) => void>();

function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/**
 * Picks the initial language: an explicit `?lang=` URL parameter wins, then the
 * language chosen last time, then the browser language (Japanese → ja, else en).
 */
export function detectInitialLang(
  search: string,
  stored: string | null,
  browserLanguages: readonly string[],
): Lang {
  const fromUrl = new URLSearchParams(search).get('lang');
  if (isLang(fromUrl)) return fromUrl;
  if (isLang(stored)) return stored;
  return browserLanguages.some((l) => l.toLowerCase().startsWith('ja')) ? 'ja' : 'en';
}

export function format(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function t(key: MessageKey, params?: MessageParams): string {
  return format(dictionaries[current][key], params);
}

export function getLang(): Lang {
  return current;
}

export function onLangChange(listener: (lang: Lang) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Fills every element marked with `data-i18n*` attributes under `root`. */
export function applyTranslations(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const params = el.dataset.i18nParams ? (JSON.parse(el.dataset.i18nParams) as MessageParams) : undefined;
    el.textContent = t(el.dataset.i18n as MessageKey, params);
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-title]')) {
    el.title = t(el.dataset.i18nTitle as MessageKey);
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel as MessageKey));
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]')) {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder as MessageKey));
  }
}

/**
 * Shows a translated message in `el` and keeps it translated when the language changes.
 */
export function localize(el: HTMLElement, key: MessageKey, params?: MessageParams): void {
  el.dataset.i18n = key;
  if (params) el.dataset.i18nParams = JSON.stringify(params);
  else delete el.dataset.i18nParams;
  el.textContent = t(key, params);
}

function readStoredLang(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function applyDocumentLang(): void {
  document.documentElement.lang = current;
  document.title = t('doc.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('doc.description'));
  applyTranslations(document);
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage may be unavailable (private mode); the choice then lasts for this visit only.
  }
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', lang);
    history.replaceState(history.state, '', url);
  }
  applyDocumentLang();
  for (const listener of listeners) listener(lang);
}

export function initI18n(): void {
  current = detectInitialLang(location.search, readStoredLang(), navigator.languages ?? [navigator.language]);
  applyDocumentLang();
}
