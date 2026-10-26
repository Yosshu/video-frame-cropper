import { normalizeRect, rectHeight, rectWidth, toVideoPoint, type Rect, type Size } from '../geometry';
import { localize } from '../i18n';

/** Pointer movement (CSS pixels) below which a press counts as a click, not a drag. */
const DRAG_THRESHOLD = 3;

interface Drag {
  pointerId: number;
  startX: number;
  startY: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
  before: Rect | null;
}

/**
 * Draws the selection over the frame (outline plus a dimmed outside) and turns pointer drags into
 * selections. Works with mouse, pen and touch.
 */
export class SelectionOverlay {
  private frame: Size = { width: 0, height: 0 };
  private current: Rect | null = null;
  private drag: Drag | null = null;
  private readonly shade: SVGPathElement;
  private readonly outlines: SVGRectElement[];

  constructor(
    private readonly svg: SVGSVGElement,
    private readonly label: HTMLElement,
    private readonly onChange: (rect: Rect | null, final: boolean) => void,
  ) {
    this.shade = svg.querySelector('.selection-shade')!;
    this.outlines = [...svg.querySelectorAll<SVGRectElement>('.selection-halo, .selection-outline')];

    svg.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    svg.addEventListener('pointermove', (event) => this.onPointerMove(event));
    svg.addEventListener('pointerup', (event) => this.onPointerUp(event));
    svg.addEventListener('pointercancel', (event) => this.cancel(event.pointerId));
    svg.addEventListener('lostpointercapture', (event) => this.cancel(event.pointerId));
  }

  setFrameSize(frame: Size): void {
    this.frame = frame;
    this.svg.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);
    this.render(this.current);
  }

  render(rect: Rect | null): void {
    this.current = rect;
    const { width, height } = this.frame;
    this.svg.classList.toggle('has-selection', rect !== null);
    this.label.hidden = rect === null;
    if (!rect) return;

    const w = rectWidth(rect);
    const h = rectHeight(rect);
    this.shade.setAttribute('d', `M0 0H${width}V${height}H0Z M${rect.x1} ${rect.y1}h${w}v${h}h${-w}Z`);
    for (const outline of this.outlines) {
      outline.setAttribute('x', String(rect.x1));
      outline.setAttribute('y', String(rect.y1));
      outline.setAttribute('width', String(w));
      outline.setAttribute('height', String(h));
    }
    this.label.textContent = `${w} × ${h}`;
    this.label.style.left = `${(rect.x1 / width) * 100}%`;
    this.label.style.top = `${(rect.y1 / height) * 100}%`;
  }

  private pointToVideo(event: PointerEvent): { x: number; y: number } {
    return toVideoPoint(event.clientX, event.clientY, this.svg.getBoundingClientRect(), this.frame);
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || this.drag || !this.frame.width) return;
    event.preventDefault();
    this.svg.setPointerCapture(event.pointerId);
    const start = this.pointToVideo(event);
    this.drag = {
      pointerId: event.pointerId,
      startX: start.x,
      startY: start.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
      before: this.current,
    };
  }

  private onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.moved) {
      const distance = Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY);
      if (distance < DRAG_THRESHOLD) return;
      drag.moved = true;
    }
    this.onChange(this.rectTo(drag, event), false);
  }

  private onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.drag = null;
    // A click without dragging keeps the current selection.
    if (!drag.moved) return;
    this.onChange(this.rectTo(drag, event) ?? drag.before, true);
  }

  private cancel(pointerId: number): void {
    const drag = this.drag;
    if (!drag || pointerId !== drag.pointerId) return;
    this.drag = null;
    if (drag.moved) this.onChange(drag.before, true);
  }

  private rectTo(drag: Drag, event: PointerEvent): Rect | null {
    const end = this.pointToVideo(event);
    return normalizeRect(drag.startX, drag.startY, end.x, end.y, this.frame);
  }
}

export interface SelectionPanelElements {
  inputs: [x1: HTMLInputElement, y1: HTMLInputElement, x2: HTMLInputElement, y2: HTMLInputElement];
  size: HTMLElement;
  hint: HTMLElement;
  clear: HTMLButtonElement;
}

export interface SelectionPanelHandlers {
  /** Applies typed coordinates; returns false when they do not describe a usable region. */
  apply(x1: number, y1: number, x2: number, y2: number): boolean;
  clear(): void;
}

/** The x1 / y1 / x2 / y2 fields, the size readout and the clear button. */
export class SelectionPanel {
  private current: Rect | null = null;

  constructor(
    private readonly els: SelectionPanelElements,
    private readonly handlers: SelectionPanelHandlers,
  ) {
    for (const input of els.inputs) {
      input.addEventListener('change', () => this.applyInputs(false));
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.applyInputs(true);
          event.preventDefault();
        } else if (event.key === 'Escape') {
          this.render(this.current);
          input.blur();
          event.preventDefault();
        }
      });
    }
    els.clear.addEventListener('click', () => handlers.clear());
  }

  setFrameSize(frame: Size): void {
    const [x1, y1, x2, y2] = this.els.inputs;
    x1.max = x2.max = String(frame.width);
    y1.max = y2.max = String(frame.height);
  }

  render(rect: Rect | null): void {
    this.current = rect;
    const values = rect ? [rect.x1, rect.y1, rect.x2, rect.y2] : ['', '', '', ''];
    this.els.inputs.forEach((input, i) => {
      input.value = String(values[i]);
      input.removeAttribute('aria-invalid');
    });
    if (rect) {
      localize(this.els.size, 'sel.size', { width: rectWidth(rect), height: rectHeight(rect) });
    } else {
      localize(this.els.size, 'sel.none');
    }
    this.els.hint.hidden = rect !== null;
    this.els.clear.disabled = rect === null;
  }

  /**
   * Leaving a field applies the numbers only when they already describe a region, so typing a new
   * region one field at a time never swaps half-entered values. Enter applies them in any order and
   * flags numbers that cannot work.
   */
  private applyInputs(explicit: boolean): void {
    const raw = this.els.inputs.map((input) => input.value.trim());
    if (!explicit && raw.some((value) => value === '')) return;
    const [x1, y1, x2, y2] = raw.map((value) => (value === '' ? NaN : Number(value))) as [number, number, number, number];
    const complete = [x1, y1, x2, y2].every(Number.isFinite);
    if (!explicit && !(complete && x1 < x2 && y1 < y2)) return;
    if (!(complete && this.handlers.apply(x1, y1, x2, y2))) {
      for (const input of this.els.inputs) input.setAttribute('aria-invalid', 'true');
    }
  }
}
