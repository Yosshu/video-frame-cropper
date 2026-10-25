import { App } from './app';
import { getLang, initI18n, onLangChange, setLang, type Lang } from './i18n';
import { AlertBanner, BusyOverlay } from './ui/overlays';
import { Viewer } from './ui/viewer';

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

function setupFileOpening(app: App): void {
  const fileInput = byId<HTMLInputElement>('file-input');
  const choose = () => fileInput.click();
  byId('open-button').addEventListener('click', choose);
  byId('choose-button').addEventListener('click', choose);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) void app.open(file);
  });

  // Files can be dropped anywhere on the page, also to replace the video that is open.
  const dropOverlay = byId('drop-overlay');
  const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;
  let dragDepth = 0;
  window.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth++;
    dropOverlay.hidden = false;
  });
  window.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dropOverlay.hidden = true;
  });
  window.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('drop', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    dropOverlay.hidden = true;
    const file = event.dataTransfer?.files[0];
    if (file) void app.open(file);
  });
}

function main(): void {
  initI18n();
  setupLanguageSwitch();

  const app = new App({
    dropzone: byId('dropzone'),
    workspace: byId('workspace'),
    meta: byId('video-meta'),
    viewer: new Viewer(byId('viewer'), byId('frame-box'), byId<HTMLCanvasElement>('frame-canvas')),
    alert: new AlertBanner(byId('alert'), byId('alert-text'), byId('alert-close')),
    busy: new BusyOverlay(byId('busy'), byId('busy-title'), byId('busy-detail')),
  });
  setupFileOpening(app);

  document.documentElement.classList.remove('booting');
}

main();
