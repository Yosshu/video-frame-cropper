import type { DecodedFrame } from '../video/types';

/** Space kept below the viewer for the controls, so the frame and the controls fit on one screen. */
const RESERVED_HEIGHT = 340;
const MIN_HEIGHT = 240;

/**
 * Shows video frames at their full resolution in a canvas that is scaled to fit the page. The
 * canvas always holds the original pixels, so cropping reads from it directly.
 */
export class Viewer {
  private readonly ctx: CanvasRenderingContext2D;
  private videoWidth = 0;
  private videoHeight = 0;
  private displayScale = 1;

  constructor(
    private readonly container: HTMLElement,
    private readonly box: HTMLElement,
    readonly canvas: HTMLCanvasElement,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    new ResizeObserver(() => this.layout()).observe(container);
    window.addEventListener('resize', () => this.layout());
  }

  /** CSS pixels per video pixel. */
  get scale(): number {
    return this.displayScale;
  }

  setVideoSize(width: number, height: number): void {
    this.videoWidth = width;
    this.videoHeight = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);
    this.layout();
  }

  /** Shows a small spinner (after a short delay) while a frame is being decoded. */
  setLoading(loading: boolean): void {
    this.box.classList.toggle('is-loading', loading);
  }

  draw(frame: DecodedFrame): void {
    frame.draw(this.ctx);
  }

  layout(): void {
    if (!this.videoWidth || !this.videoHeight) return;
    const style = getComputedStyle(this.container);
    const availableWidth =
      this.container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = Math.max(MIN_HEIGHT, window.innerHeight - RESERVED_HEIGHT);
    if (availableWidth <= 0) return;

    this.displayScale = Math.min(availableWidth / this.videoWidth, availableHeight / this.videoHeight);
    this.box.style.width = `${Math.round(this.videoWidth * this.displayScale)}px`;
    this.box.style.height = `${Math.round(this.videoHeight * this.displayScale)}px`;
    // Enlarged small videos show crisp pixels, which helps when selecting precisely.
    this.canvas.classList.toggle('pixelated', this.displayScale >= 2);
  }
}
