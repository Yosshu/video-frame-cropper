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
    if (this.stream && (await this.canContinue(this.stream, index))) {
      const sample = await this.advance(this.stream, index);
      if (sample) return wrapSample(sample);
    }
    await this.closeStream();
    const stream: FrameStream = { iterator: this.sink.samples(this.table.queryTime(index)), nextIndex: index };
    this.stream = stream;
    const sample = await this.advance(stream, index);
    if (sample) return wrapSample(sample);

    // The stream did not line up with the frame table; fall back to a one-off decode.
    await this.closeStream();
    const single = await this.sink.getSample(this.table.queryTime(index));
    if (!single) throw new Error(`No frame decoded for #${index}`);
    return wrapSample(single);
  }

  dispose(): void {
    this.stream = null;
    this.input.dispose();
  }

  /** Continuing is cheaper than restarting unless a key frame lies between the stream and the target. */
  private async canContinue(stream: FrameStream, index: number): Promise<boolean> {
    if (index < stream.nextIndex) return false;
    if (index === stream.nextIndex) return true;
    const key = await this.packets.getKeyPacket(this.table.queryTime(index), { metadataOnly: true });
    return !key || key.timestamp < this.table.timestamp(stream.nextIndex) + TIMESTAMP_TOLERANCE;
  }

  /** Reads the stream up to frame `index`; returns null if the stream ends or skips past it. */
  private async advance(stream: FrameStream, index: number): Promise<VideoSample | null> {
    const target = this.table.timestamp(index);
    for (;;) {
      const result = await stream.iterator.next();
      if (result.done) return null;
      const sample = result.value;
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
      duration: table.duration,
      codec: codecName,
    };
    return new MediabunnySource(info, input, table, new VideoSampleSink(track), packetSink);
  } catch (error) {
    input.dispose();
    throw error;
  }
}
