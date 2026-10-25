import {
  BlobSource,
  CanvasSink,
  EncodedPacketSink,
  Input,
  MATROSKA,
  MP4,
  MPEG_TS,
  QTFF,
  WEBM,
  type VideoCodec,
} from 'mediabunny';
import { FrameTable, type PacketTiming } from './frame-table';
import { VideoOpenError, type FrameSource, type OpenProgress, type VideoInfo } from './types';

const CODEC_NAMES: Record<VideoCodec, string> = {
  avc: 'H.264',
  hevc: 'H.265/HEVC',
  vp8: 'VP8',
  vp9: 'VP9',
  av1: 'AV1',
  prores: 'ProRes',
};

/** Decodes video with the browser's WebCodecs decoders; frame numbers are exact. */
class MediabunnySource implements FrameSource {
  constructor(
    readonly info: VideoInfo,
    private readonly input: Input,
    private readonly table: FrameTable,
    private readonly sink: CanvasSink,
  ) {}

  timeOf(index: number): number {
    return this.table.relativeTime(index);
  }

  async getFrame(index: number): Promise<CanvasImageSource> {
    const wrapped = await this.sink.getCanvas(this.table.queryTime(index));
    if (!wrapped) throw new Error(`No frame decoded for #${index}`);
    return wrapped.canvas;
  }

  dispose(): void {
    this.input.dispose();
  }
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
    return new MediabunnySource(info, input, table, new CanvasSink(track, { poolSize: 2 }));
  } catch (error) {
    input.dispose();
    throw error;
  }
}
