export interface VideoInfo {
  fileName: string;
  /** Display size in pixels: the orientation and aspect ratio the video is meant to be viewed at. */
  width: number;
  height: number;
  frameCount: number;
  /** Average frames per second, or null when unknown. */
  fps: number | null;
  /** Seconds. */
  duration: number;
  /** Human-readable codec name such as "H.264", or null when unknown. */
  codec: string | null;
}

/** A decoded video that can produce any of its frames by number. */
export interface FrameSource {
  readonly info: VideoInfo;
  /** Seconds from the first frame to the start of frame `index`. */
  timeOf(index: number): number;
  /** Decodes frame `index` as an image of `info.width` × `info.height` pixels. */
  getFrame(index: number): Promise<CanvasImageSource>;
  dispose(): void;
}

export type OpenErrorCode = 'unsupported-format' | 'no-video-track' | 'unsupported-codec' | 'no-frames' | 'read-failed';

export class VideoOpenError extends Error {
  constructor(
    readonly code: OpenErrorCode,
    readonly detail?: string,
    options?: ErrorOptions,
  ) {
    super(detail ? `${code}: ${detail}` : code, options);
    this.name = 'VideoOpenError';
  }
}

export interface OpenProgress {
  phase: 'reading' | 'indexing';
  /** Frames counted so far while indexing. */
  frames?: number;
}
