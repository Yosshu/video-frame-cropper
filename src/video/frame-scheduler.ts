/**
 * Serializes frame loads and skips stale requests: while one frame is being decoded, only the most
 * recently requested frame is kept waiting. Dragging the slider therefore never builds up a backlog.
 */
export class FrameScheduler {
  private pending: number | null = null;
  private running: Promise<void> | null = null;

  constructor(private readonly load: (index: number) => Promise<void>) {}

  /** Resolves once the requested frame, or a newer request that replaced it, has been handled. */
  request(index: number): Promise<void> {
    this.pending = index;
    this.running ??= this.pump();
    return this.running;
  }

  /** Resolves when no frame is loading or waiting. */
  idle(): Promise<void> {
    return this.running ?? Promise.resolve();
  }

  private async pump(): Promise<void> {
    try {
      while (this.pending !== null) {
        const index = this.pending;
        this.pending = null;
        await this.load(index);
      }
    } finally {
      this.running = null;
    }
  }
}
