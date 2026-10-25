export interface VideoInfo {
  fileName: string;
  /** Display size in pixels: the orientation and aspect ratio the video is meant to be viewed at. */
  width: number;
  height: number;
  frameCount: number;
  /** Average frames per second, or null when unknown. */
  fps: number | null;
  /** True for variable frame rate videos, where `fps` is only an average. */
  variableFrameRate: boolean;
  /** Seconds. */
  duration: number;
  /** Human-readable codec name such as "H.264", or null when unknown. */
  codec: string | null;
}

/** A decoded frame. It holds decoder memory until it is closed. */
export interface DecodedFrame {
  /** Draws the frame, in its display orientation, over the whole canvas of `ctx`. */
  draw(ctx: CanvasRenderingContext2D): void;
  close(): void;
}

/** A video that can decode any of its frames by number. */
export interface FrameSource {
  readonly info: VideoInfo;
  /** Seconds from the first frame to the start of frame `index`. */
  timeOf(index: number): number;
  getFrame(index: number): Promise<DecodedFrame>;
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
