import { localize, type MessageKey, type MessageParams } from '../i18n';

/** A dismissible error banner whose text follows language changes. */
export class AlertBanner {
  constructor(
    private readonly root: HTMLElement,
    private readonly text: HTMLElement,
    close: HTMLElement,
  ) {
    close.addEventListener('click', () => this.hide());
  }

  show(key: MessageKey, params?: MessageParams): void {
    localize(this.text, key, params);
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }
}

/** A modal "working…" card shown while a video is opening. */
export class BusyOverlay {
  constructor(
    private readonly root: HTMLElement,
    private readonly title: HTMLElement,
    private readonly detail: HTMLElement,
  ) {}

  show(key: MessageKey, params?: MessageParams, detail = ''): void {
    localize(this.title, key, params);
    this.detail.textContent = detail;
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }
}

/** A short confirmation at the bottom of the screen. */
export class Toast {
  private timer: number | undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly text: HTMLElement,
  ) {}

  show(key: MessageKey, params?: MessageParams): void {
    localize(this.text, key, params);
    this.root.hidden = false;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => (this.root.hidden = true), 3500);
  }
}
