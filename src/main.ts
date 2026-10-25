import { getLang, initI18n, onLangChange, setLang, type Lang } from './i18n';

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function setupLanguageSwitch(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.lang-switch button[data-lang]');
  const sync = (lang: Lang) => {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
  };
  for (const button of buttons) {
    button.addEventListener('click', () => setLang(button.dataset.lang as Lang));
  }
  onLangChange(sync);
  sync(getLang());
}

function main(): void {
  initI18n();
  setupLanguageSwitch();

  const fileInput = byId<HTMLInputElement>('file-input');
  byId('open-button').addEventListener('click', () => fileInput.click());
  byId('choose-button').addEventListener('click', () => fileInput.click());

  document.documentElement.classList.remove('booting');
}

main();
