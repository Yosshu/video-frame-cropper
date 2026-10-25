import { fitRect, normalizeRect, type Rect } from './geometry';
import { formatFps, formatTime } from './format';
import { localize } from './i18n';
import { AlertBanner, BusyOverlay } from './ui/overlays';
import type { SelectionOverlay, SelectionPanel } from './ui/selection';
import type { Timeline } from './ui/timeline';
import { Viewer } from './ui/viewer';
import { FrameScheduler } from './video/frame-scheduler';
import { openVideo } from './video/open';
import { VideoOpenError, type FrameSource } from './video/types';

export interface AppElements {
  dropzone: HTMLElement;
  workspace: HTMLElement;
  meta: HTMLElement;
  viewer: Viewer;
  timeline: Timeline;
  selectionOverlay: SelectionOverlay;
  selectionPanel: SelectionPanel;
  alert: AlertBanner;
  busy: BusyOverlay;
}

export class App {
  private source: FrameSource | null = null;
  private loading: AbortController | null = null;
  private readonly scheduler = new FrameScheduler((index) => this.loadFrame(index));
  /** The frame the user asked for; the canvas shows it once it has been decoded. */
  private index = 0;
  /** Kept when moving between frames (and videos), so one region can be cut from many frames. */
  private selection: Rect | null = null;

  constructor(private readonly ui: AppElements) {}

  get hasVideo(): boolean {
    return this.source !== null;
  }

  get lastIndex(): number {
    return this.source ? this.source.info.frameCount - 1 : 0;
  }

  goTo(index: number): void {
    const source = this.source;
    if (!source) return;
    const clamped = Math.min(Math.max(Math.round(index), 0), this.lastIndex);
    this.index = clamped;
    this.ui.timeline.setPosition(clamped, source.timeOf(clamped), this.lastIndex);
    this.ui.viewer.setLoading(true);
    void this.scheduler.request(clamped).then(() => {
      if (!this.scheduler.busy) this.ui.viewer.setLoading(false);
    });
  }

  step(delta: number): void {
    this.goTo(this.index + delta);
  }

  setSelection(rect: Rect | null): void {
    this.selection = rect;
    this.ui.selectionOverlay.render(rect);
    this.ui.selectionPanel.render(rect);
  }

  /** Applies typed coordinates. Returns false if they leave no area inside the frame. */
  applySelectionInput(x1: number, y1: number, x2: number, y2: number): boolean {
    if (!this.source) return false;
    const rect = normalizeRect(x1, y1, x2, y2, this.source.info);
    if (rect) this.setSelection(rect);
    return rect !== null;
  }

  async open(file: File): Promise<void> {
    this.loading?.abort();
    const loading = new AbortController();
    this.loading = loading;
    this.ui.alert.hide();
    this.ui.busy.show('busy.opening', undefined, file.name);

    try {
      const source = await openVideo(
        file,
        (progress) => {
          if (progress.phase === 'indexing' && !loading.signal.aborted) {
            this.ui.busy.show('busy.indexing', { count: progress.frames ?? 0 }, file.name);
          }
        },
        loading.signal,
      );
      if (loading.signal.aborted) {
        source.dispose();
        return;
      }
      this.setSource(source);
      this.goTo(0);
      await this.scheduler.idle();
    } catch (error) {
      if (!loading.signal.aborted) this.showOpenError(error);
    } finally {
      if (this.loading === loading) {
        this.loading = null;
        this.ui.busy.hide();
      }
    }
  }

  private setSource(source: FrameSource): void {
    this.source?.dispose();
    this.source = source;

    const { info } = source;
    this.ui.viewer.setVideoSize(info.width, info.height);
    this.ui.timeline.setFrameCount(info.frameCount);
    this.ui.selectionOverlay.setFrameSize(info);
    this.ui.selectionPanel.setFrameSize(info);
    this.setSelection(this.selection && fitRect(this.selection, info));
    this.renderMeta(source);
    this.ui.dropzone.hidden = true;
    this.ui.workspace.hidden = false;
    this.ui.viewer.layout();
  }

  private async loadFrame(index: number): Promise<void> {
    const source = this.source;
    if (!source) return;
    try {
      const frame = await source.getFrame(index);
      try {
        if (source === this.source) this.ui.viewer.draw(frame);
      } finally {
        frame.close();
      }
    } catch (error) {
      if (source !== this.source) return;
      console.error(error);
      this.ui.alert.show('error.decode', { frame: index });
    }
  }

  private renderMeta(source: FrameSource): void {
    const { info } = source;
    const meta = this.ui.meta;
    meta.replaceChildren();

    const name = document.createElement('span');
    name.className = 'meta-name';
    name.textContent = info.fileName;
    name.title = info.fileName;
    meta.append(name);

    const addItem = (text?: string) => {
      const item = document.createElement('span');
      item.className = 'meta-item';
      if (text !== undefined) item.textContent = text;
      meta.append(item);
      return item;
    };
    addItem(`${info.width}×${info.height}`);
    if (info.fps !== null) addItem(`${formatFps(info.fps)} fps`);
    localize(addItem(), 'meta.frames', { count: info.frameCount });
    addItem(formatTime(info.duration));
    if (info.codec) addItem(info.codec);
  }

  private showOpenError(error: unknown): void {
    console.error(error);
    if (!(error instanceof VideoOpenError)) {
      this.ui.alert.show('error.open.read-failed', { detail: String(error) });
      return;
    }
    switch (error.code) {
      case 'unsupported-codec':
        if (error.detail) this.ui.alert.show('error.open.unsupported-codec', { codec: error.detail });
        else this.ui.alert.show('error.open.unsupported-codec-unknown');
        break;
      case 'read-failed':
        this.ui.alert.show('error.open.read-failed', { detail: error.detail ?? '' });
        break;
      default:
        this.ui.alert.show(`error.open.${error.code}`);
    }
  }
}
