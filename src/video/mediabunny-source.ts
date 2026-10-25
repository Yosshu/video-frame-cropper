import {
  BlobSource,
  EncodedPacketSink,
  Input,
  MATROSKA,
  MP4,
  MPEG_TS,
  QTFF,
  VideoSampleSink,
  WEBM,
  type VideoCodec,
  type VideoSample,
} from 'mediabunny';
import { FrameTable, type PacketTiming } from './frame-table';
import { VideoOpenError, type DecodedFrame, type FrameSource, type OpenProgress, type VideoInfo } from './types';

const CODEC_NAMES: Record<VideoCodec, string> = {
  avc: 'H.264',
  hevc: 'H.265/HEVC',
  vp8: 'VP8',
  vp9: 'VP9',
  av1: 'AV1',
  prores: 'ProRes',
};

/** Decoded timestamps are rounded to microseconds, so frames are matched with a small tolerance. */
const TIMESTAMP_TOLERANCE = 5e-4;
/** Limits for the full-resolution frames kept for stepping backwards. */
const KEEP_MAX_BYTES = 256 * 1024 * 1024;
const KEEP_MAX_FRAMES = 60;
/** Extra time a step back may spend keeping frames for the following steps. */
const KEEP_TIME_BUDGET_MS = 300;
/** Below this cost per frame, every shown frame is kept too, so stepping back and forth is instant. */
const KEEP_SHOWN_MAX_MS = 6;

interface FrameStream {
  iterator: AsyncGenerator<VideoSample, void, unknown>;
  /** The frame number the iterator yields next. */
  nextIndex: number;
}

/** Decodes video with the browser's WebCodecs decoders; frame numbers are exact. */
class MediabunnySource implements FrameSource {
  /**
   * An open decoding stream. Stepping forward continues it instead of decoding again from the
   * previous key frame, which keeps frame-by-frame stepping fast in videos with long GOPs.
   */
  private stream: FrameStream | null = null;
  /**
   * Decoders can only run forwards, so every step back decodes again from the previous key frame.
   * When that happens, the frames just before the target are kept here so the next steps back
   * are instant.
   */
  private readonly kept = new Map<number, ImageBitmap>();
  private snapshotCanvas: OffscreenCanvas | null = null;
  /** Measured milliseconds to keep one frame (fast with a GPU, slow with software rendering). */
  private keepCost = 2;
  private lastIndex = -1;

  constructor(
    readonly info: VideoInfo,
    private readonly input: Input,
    private readonly table: FrameTable,
    private readonly sink: VideoSampleSink,
    private readonly packets: EncodedPacketSink,
  ) {}

  timeOf(index: number): number {
    return this.table.relativeTime(index);
  }

  async getFrame(index: number): Promise<DecodedFrame> {
    const steppingBack = index === this.lastIndex - 1;
    this.lastIndex = index;

    const kept = this.kept.get(index);
    if (kept) return wrapBitmap(kept);

    const keepShown = this.keepCost <= KEEP_SHOWN_MAX_MS ? index : Infinity;
    if (this.stream && (await this.canContinue(this.stream, index))) {
      const sample = await this.advance(this.stream, index, keepShown);
      if (sample) return wrapSample(sample);
    }
    await this.closeStream();
    let start = index;
    let keepFrom = keepShown;
    if (steppingBack) {
      const affordable = Math.floor(KEEP_TIME_BUDGET_MS / this.keepCost);
      const count = Math.max(1, Math.min(this.keepCapacity(), affordable));
      // Frames before the key frame need an earlier key frame, so keeping stops there.
      start = keepFrom = Math.max(await this.keyFrameIndex(index), index - count + 1);
    }
    // The decoder starts at the key frame either way; frames before `start` never reach us.
    const stream: FrameStream = { iterator: this.sink.samples(this.table.queryTime(start)), nextIndex: start };
    this.stream = stream;
    const sample = await this.advance(stream, index, keepFrom);
    if (sample) return wrapSample(sample);

    // The stream did not line up with the frame table; fall back to a one-off decode.
    await this.closeStream();
    const single = await this.sink.getSample(this.table.queryTime(index));
    if (!single) throw new Error(`No frame decoded for #${index}`);
    return wrapSample(single);
  }

  dispose(): void {
    this.stream = null;
    for (const bitmap of this.kept.values()) bitmap.close();
    this.kept.clear();
    this.input.dispose();
  }

  /** Continuing is cheaper than restarting unless a key frame lies between the stream and the target. */
  private async canContinue(stream: FrameStream, index: number): Promise<boolean> {
    if (index < stream.nextIndex) return false;
    if (index === stream.nextIndex) return true;
    const key = await this.packets.getKeyPacket(this.table.queryTime(index), { metadataOnly: true });
    return !key || key.timestamp < this.table.timestamp(stream.nextIndex) + TIMESTAMP_TOLERANCE;
  }

  /**
   * Reads the stream up to frame `index`; returns null if the stream ends or skips past it.
   * Frames from `keepFrom` on (including the target) are kept for stepping backwards.
   */
  private async advance(stream: FrameStream, index: number, keepFrom = Infinity): Promise<VideoSample | null> {
    const target = this.table.timestamp(index);
    for (;;) {
      const result = await stream.iterator.next();
      if (result.done) return null;
      const sample = result.value;
      const expected = stream.nextIndex;
      const aligned =
        expected < this.table.count &&
        Math.abs(sample.timestamp - this.table.timestamp(expected)) <= TIMESTAMP_TOLERANCE;
      if (aligned) stream.nextIndex = expected + 1;
      if (aligned && expected >= keepFrom) this.keep(expected, sample);

      if (sample.timestamp < target - TIMESTAMP_TOLERANCE) {
        sample.close();
        continue;
      }
      if (sample.timestamp > target + TIMESTAMP_TOLERANCE) {
        sample.close();
        return null;
      }
      stream.nextIndex = index + 1;
      return sample;
    }
  }

  private async keyFrameIndex(index: number): Promise<number> {
    const key = await this.packets.getKeyPacket(this.table.queryTime(index), { metadataOnly: true });
    return key ? Math.min(index, this.table.indexAtOrBefore(key.timestamp + TIMESTAMP_TOLERANCE)) : 0;
  }

  private keepCapacity(): number {
    const frameBytes = this.info.width * this.info.height * 4;
    return Math.max(1, Math.min(KEEP_MAX_FRAMES, Math.floor(KEEP_MAX_BYTES / frameBytes)));
  }

  /** Copies a decoded frame (orientation applied) into a bitmap that outlives the decoder's frame. */
  private keep(index: number, sample: VideoSample): void {
    if (typeof OffscreenCanvas === 'undefined' || this.kept.has(index)) return;
    const started = performance.now();
    this.snapshotCanvas ??= new OffscreenCanvas(this.info.width, this.info.height);
    const ctx = this.snapshotCanvas.getContext('2d');
    if (!ctx) return;
    sample.drawWithFit(ctx, { fit: 'fill' });
    this.kept.set(index, this.snapshotCanvas.transferToImageBitmap());
    this.keepCost = 0.7 * this.keepCost + 0.3 * (performance.now() - started);

    // Over the limit, drop the frames farthest from where the user is.
    const capacity = this.keepCapacity();
    while (this.kept.size > capacity) {
      let farthest = index;
      for (const key of this.kept.keys()) {
        if (Math.abs(key - this.lastIndex) > Math.abs(farthest - this.lastIndex)) farthest = key;
      }
      this.kept.get(farthest)?.close();
      this.kept.delete(farthest);
    }
  }

  private async closeStream(): Promise<void> {
    const stream = this.stream;
    this.stream = null;
    await stream?.iterator.return();
  }
}

function wrapSample(sample: VideoSample): DecodedFrame {
  return {
    draw: (ctx) => sample.drawWithFit(ctx, { fit: 'fill' }),
    close: () => sample.close(),
  };
}

/** A kept frame; the cache owns the bitmap, so closing the wrapper does nothing. */
function wrapBitmap(bitmap: ImageBitmap): DecodedFrame {
  return {
    draw: (ctx) => ctx.drawImage(bitmap, 0, 0, ctx.canvas.width, ctx.canvas.height),
    close: () => {},
  };
}

export async function openWithMediabunny(
  file: File,
  onProgress: (progress: OpenProgress) => void,
  signal: AbortSignal,
): Promise<FrameSource> {
  const input = new Input({
    source: new BlobSource(file),
    formats: [MP4, QTFF, MATROSKA, WEBM, MPEG_TS],
  });
  try {
    onProgress({ phase: 'reading' });
    if (!(await input.canRead())) throw new VideoOpenError('unsupported-format');
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new VideoOpenError('no-video-track');

    const codec = await track.getCodec();
    const codecName = codec ? CODEC_NAMES[codec] : null;
    if (!(await track.canDecode())) throw new VideoOpenError('unsupported-codec', codecName ?? undefined);

    const packets: PacketTiming[] = [];
    const packetSink = new EncodedPacketSink(track);
    for await (const packet of packetSink.packets(undefined, undefined, { metadataOnly: true })) {
      packets.push({ timestamp: packet.timestamp, duration: packet.duration });
      if (packets.length % 2000 === 0) {
        signal.throwIfAborted();
        onProgress({ phase: 'indexing', frames: packets.length });
      }
    }
    signal.throwIfAborted();

    const table = FrameTable.fromPackets(packets);
    if (table.count === 0) throw new VideoOpenError('no-frames');

    const info: VideoInfo = {
      fileName: file.name,
      width: await track.getDisplayWidth(),
      height: await track.getDisplayHeight(),
      frameCount: table.count,
      fps: table.averageFrameRate,
      variableFrameRate: table.isVariableRate,
      duration: table.duration,
      codec: codecName,
    };
    return new MediabunnySource(info, input, table, new VideoSampleSink(track), packetSink);
  } catch (error) {
    input.dispose();
    throw error;
  }
}
