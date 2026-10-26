import { formatTime } from '../format';

export interface TimelineElements {
  slider: HTMLInputElement;
  input: HTMLInputElement;
  total: HTMLElement;
  time: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
}

export interface TimelineHandlers {
  seek(index: number): void;
  step(delta: number): void;
}

/** Repeats `action` while the button is held down, like a keyboard key. */
function holdToRepeat(button: HTMLElement, action: () => void): void {
  let timer: number | undefined;
  const stop = () => {
    window.clearTimeout(timer);
    timer = undefined;
  };
  const repeatAfter = (delay: number) => {
    timer = window.setTimeout(() => {
      action();
      repeatAfter(70);
    }, delay);
  };
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    stop();
    action();
    repeatAfter(400);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) {
    button.addEventListener(type, stop);
  }
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  // Keyboard activation (Enter / Space) arrives as a click that no pointer press preceded.
  button.addEventListener('click', (event) => {
    if (event.detail === 0) action();
  });
}

/** The slider, frame number field and step buttons below the viewer. */
export class Timeline {
  constructor(
    private readonly els: TimelineElements,
    handlers: TimelineHandlers,
  ) {
    els.slider.addEventListener('input', () => handlers.seek(els.slider.valueAsNumber));
    els.input.addEventListener('change', () => {
      const value = Number.parseInt(els.input.value, 10);
      handlers.seek(Number.isFinite(value) ? value : els.slider.valueAsNumber);
    });
    els.input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') els.input.value = els.slider.value;
      // Leaving the field commits the number (a change event) and lets the arrow keys step frames again.
      if (event.key === 'Enter' || event.key === 'Escape') {
        els.input.blur();
        event.preventDefault();
      }
    });
    holdToRepeat(els.prev, () => handlers.step(-1));
    holdToRepeat(els.next, () => handlers.step(1));
  }

  setFrameCount(count: number): void {
    const last = String(Math.max(0, count - 1));
    this.els.slider.max = last;
    this.els.input.max = last;
    this.els.total.textContent = `/ ${last}`;
  }

  setPosition(index: number, seconds: number, last: number): void {
    this.els.slider.value = String(index);
    this.els.input.value = String(index);
    this.els.time.textContent = formatTime(seconds);
    this.els.prev.disabled = index <= 0;
    this.els.next.disabled = index >= last;
  }
}
