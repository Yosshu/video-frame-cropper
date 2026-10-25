import { App } from './app';
import { getLang, initI18n, onLangChange, setLang, type Lang } from './i18n';
import { AlertBanner, BusyOverlay } from './ui/overlays';
import { SelectionOverlay, SelectionPanel } from './ui/selection';
import { Timeline } from './ui/timeline';
import { Viewer } from './ui/viewer';

function byId<T extends Element = HTMLElement>(id: string): T {
  const el: Element | null = document.getElementById(id);
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

/** True for fields where arrow keys and letters edit text instead of triggering shortcuts. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }
  if (target instanceof HTMLInputElement) {
    return !['range', 'button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'color'].includes(target.type);
  }
  return false;
}

function setupShortcuts(app: App): void {
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTextEntry(event.target) || !app.hasVideo) return;
    switch (event.key) {
      case 'ArrowLeft':
        app.step(event.shiftKey ? -10 : -1);
        break;
      case 'ArrowRight':
        app.step(event.shiftKey ? 10 : 1);
        break;
      case 'Home':
        app.goTo(0);
        break;
      case 'End':
        app.goTo(app.lastIndex);
        break;
      case 'Escape':
        app.setSelection(null);
        break;
      default:
        return;
    }
    event.preventDefault();
  });
}

function main(): void {
  initI18n();
  setupLanguageSwitch();

  let app: App | null = null;
  const timeline = new Timeline(
    {
      slider: byId('frame-slider'),
      input: byId('frame-input'),
      total: byId('frame-total'),
      time: byId('frame-time'),
      prev: byId('prev-frame'),
      next: byId('next-frame'),
    },
    {
      seek: (index) => app?.goTo(index),
      step: (delta) => app?.step(delta),
    },
  );
  app = new App({
    dropzone: byId('dropzone'),
    workspace: byId('workspace'),
    meta: byId('video-meta'),
    viewer: new Viewer(byId('viewer'), byId('frame-box'), byId<HTMLCanvasElement>('frame-canvas')),
    timeline,
    selectionOverlay: new SelectionOverlay(byId<SVGSVGElement>('selection-overlay'), byId('selection-label'), (rect) =>
      app?.setSelection(rect),
    ),
    selectionPanel: new SelectionPanel(
      {
        inputs: [byId('sel-x1'), byId('sel-y1'), byId('sel-x2'), byId('sel-y2')],
        size: byId('sel-size'),
        hint: byId('sel-hint'),
        clear: byId('sel-clear'),
      },
      {
        apply: (x1, y1, x2, y2) => app?.applySelectionInput(x1, y1, x2, y2) ?? false,
        clear: () => app?.setSelection(null),
      },
    ),
    alert: new AlertBanner(byId('alert'), byId('alert-text'), byId('alert-close')),
    busy: new BusyOverlay(byId('busy'), byId('busy-title'), byId('busy-detail')),
  });
  setupFileOpening(app);
  setupShortcuts(app);

  document.documentElement.classList.remove('booting');
}

main();
