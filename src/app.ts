import { formatFps, formatTime } from './format';
import { localize } from './i18n';
import { AlertBanner, BusyOverlay } from './ui/overlays';
import { Viewer } from './ui/viewer';
import { FrameScheduler } from './video/frame-scheduler';
import { openVideo } from './video/open';
import { VideoOpenError, type FrameSource } from './video/types';

export interface AppElements {
  dropzone: HTMLElement;
  workspace: HTMLElement;
  meta: HTMLElement;
  viewer: Viewer;
  alert: AlertBanner;
  busy: BusyOverlay;
}

export class App {
  private source: FrameSource | null = null;
  private loading: AbortController | null = null;
  private readonly scheduler = new FrameScheduler((index) => this.loadFrame(index));

  constructor(private readonly ui: AppElements) {}

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
      await this.scheduler.request(0);
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
    this.renderMeta(source);
    this.ui.dropzone.hidden = true;
    this.ui.workspace.hidden = false;
    this.ui.viewer.layout();
  }

  private async loadFrame(index: number): Promise<void> {
    const source = this.source;
    if (!source) return;
    try {
      const image = await source.getFrame(index);
      if (source !== this.source) return;
      this.ui.viewer.draw(image);
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
