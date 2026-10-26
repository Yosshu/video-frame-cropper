import { FFmpeg, FFFSType } from '@ffmpeg/ffmpeg';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { parseCompact, parsePam, parseShowinfoTimes } from './ffmpeg-output';
import { FrameTable, type PacketTiming } from './frame-table';
import { VideoOpenError, type DecodedFrame, type FrameSource, type OpenProgress, type VideoInfo } from './types';

/** ffprobe prints times with microsecond precision. */
const TIMESTAMP_TOLERANCE = 5e-4;
/** Memory for decoded frames kept around; frames are extracted in batches to amortize each run. */
const CACHE_BYTES = 192 * 1024 * 1024;
const MAX_BATCH = 15;

const CODEC_NAMES: Record<string, string> = {
  h264: 'H.264',
  hevc: 'H.265/HEVC',
  mpeg4: 'MPEG-4 Part 2',
  msmpeg4v2: 'MS MPEG-4 v2',
  msmpeg4v3: 'MS MPEG-4 v3',
  mjpeg: 'Motion JPEG',
  mpeg1video: 'MPEG-1',
  mpeg2video: 'MPEG-2',
  wmv1: 'WMV 7',
  wmv2: 'WMV 8',
  wmv3: 'WMV 9',
  vc1: 'VC-1',
  flv1: 'Sorenson H.263',
  h263: 'H.263',
  prores: 'ProRes',
  dvvideo: 'DV',
  vp8: 'VP8',
  vp9: 'VP9',
  av1: 'AV1',
  rawvideo: 'Raw video',
};

let shared: Promise<FFmpeg> | null = null;
let mountCounter = 0;
/** Collects ffmpeg's log lines while a command whose output we need is running. */
let logLines: string[] | null = null;

/** Loads ffmpeg.wasm once (about 30 MB, cached by the browser afterwards). */
function getFFmpeg(): Promise<FFmpeg> {
  shared ??= (async () => {
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => logLines?.push(message));
    // The worker resolves URLs against its own location, so pass absolute ones.
    await ffmpeg.load({
      coreURL: new URL(coreURL, document.baseURI).href,
      wasmURL: new URL(wasmURL, document.baseURI).href,
    });
    return ffmpeg;
  })().catch((error: unknown) => {
    shared = null;
    throw error;
  });
  return shared;
}

/**
 * Runs ffprobe and returns what it wrote to `output`, or null if it wrote nothing. ffmpeg.wasm does
 * not report a reliable exit code for ffprobe, so the output file is what tells success apart.
 */
async function probe(ffmpeg: FFmpeg, args: string[], output: string): Promise<string | null> {
  await ffmpeg.ffprobe([...args, '-o', output]);
  let data: Uint8Array | string;
  try {
    data = await ffmpeg.readFile(output, 'utf8');
  } catch {
    return null;
  }
  await ffmpeg.deleteFile(output).catch(() => {});
  const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
  return text.trim() === '' ? null : text;
}

/** Runs an ffmpeg command and returns its log. */
async function execWithLog(ffmpeg: FFmpeg, args: string[]): Promise<{ code: number; log: string[] }> {
  const log: string[] = [];
  logLines = log;
  try {
    return { code: await ffmpeg.exec(args), log };
  } finally {
    if (logLines === log) logLines = null;
  }
}

/**
 * Reads videos the browser cannot decode itself (AVI, WMV, FLV, MPEG-PS, ProRes, HEVC in some
 * browsers, or any video where WebCodecs is missing) with ffmpeg compiled to WebAssembly. Slower
 * than WebCodecs, so frames are extracted in small batches and kept for stepping in both directions.
 */
class FFmpegSource implements FrameSource {
  private readonly cache = new Map<number, ImageBitmap>();
  private readonly batchSize: number;
  private readonly capacity: number;
  private lastIndex = -1;
  private disposed = false;
  /**
   * Decoded frames can carry timestamps shifted from the container's: in AVI files with B-frames
   * they lag one frame behind. Measured on the first frames, where the order alone identifies them.
   */
  private timeOffset: number | null = null;

  constructor(
    readonly info: VideoInfo,
    private readonly ffmpeg: FFmpeg,
    private readonly mountPoint: string,
    private readonly path: string,
    private readonly table: FrameTable,
    /** Container start time: ffmpeg's -ss is relative to it. */
    private readonly startTime: number,
  ) {
    const frameBytes = info.width * info.height * 4;
    this.batchSize = Math.max(1, Math.min(MAX_BATCH, Math.floor(CACHE_BYTES / 3 / frameBytes)));
    this.capacity = Math.max(this.batchSize, Math.floor(CACHE_BYTES / frameBytes));
  }

  timeOf(index: number): number {
    return this.table.relativeTime(index);
  }

  async getFrame(index: number): Promise<DecodedFrame> {
    const steppingBack = index === this.lastIndex - 1;
    this.lastIndex = index;
    if (this.timeOffset === null) await this.extract(0, Math.min(this.batchSize, this.info.frameCount));
    if (!this.cache.has(index)) {
      const start = steppingBack ? Math.max(0, index - this.batchSize + 1) : index;
      await this.extract(start, Math.min(this.batchSize, this.info.frameCount - start));
    }
    const bitmap = this.cache.get(index);
    if (!bitmap) throw new Error(`ffmpeg produced no image for frame ${index}`);
    return {
      draw: (ctx) => ctx.drawImage(bitmap, 0, 0, ctx.canvas.width, ctx.canvas.height),
      // The cache owns the bitmap.
      close: () => {},
    };
  }

  dispose(): void {
    this.disposed = true;
    for (const bitmap of this.cache.values()) bitmap.close();
    this.cache.clear();
    void this.ffmpeg
      .unmount(this.mountPoint)
      .then(() => this.ffmpeg.deleteDir(this.mountPoint))
      .catch(() => {});
  }

  /**
   * Decodes frames `start` … `start + count - 1`. Whether ffmpeg's seek also returns the frame that
   * is on screen at the seek point differs between files, so the seek aims one frame early and every
   * image is matched to a frame number by the timestamp ffmpeg reports for it. Without seeking, the
   * n-th image is simply frame n.
   */
  private async extract(start: number, count: number): Promise<void> {
    const prefix = `${this.mountPoint}-out`;
    const from = Math.max(0, start - 1);
    const offset = this.timeOffset ?? 0;
    // The log level must be set every time: ffmpeg.wasm keeps it from the previous command.
    const args = ['-hide_banner', '-v', 'info', '-copyts'];
    if (from > 0) {
      args.push('-ss', (this.table.timestamp(from) + Math.min(0, offset) - this.startTime).toFixed(6));
    }
    args.push(
      '-i', this.path,
      '-map', '0:v:0',
      '-frames:v', String(count + (start - from) + 1),
      '-vf', 'showinfo',
      '-fps_mode', 'passthrough',
      '-c:v', 'pam',
      '-pix_fmt', 'rgba',
      '-f', 'image2',
      '-start_number', '0',
      `${prefix}%03d.pam`,
    );
    const { code, log } = await execWithLog(this.ffmpeg, args);
    if (code !== 0) {
      console.warn(log.join('\n'));
      throw new Error(`ffmpeg exited with code ${code}`);
    }

    const times = parseShowinfoTimes(log);
    // Without timestamps the offset is assumed to be zero, so the first frames are not extracted again.
    if (from === 0) this.timeOffset ??= times[0] !== undefined ? times[0] - this.table.timestamp(0) : 0;
    for (let i = 0; ; i++) {
      const name = `${prefix}${String(i).padStart(3, '0')}.pam`;
      let data: Uint8Array | string;
      try {
        data = await this.ffmpeg.readFile(name);
      } catch {
        break; // no more images
      }
      await this.ffmpeg.deleteFile(name).catch(() => {});
      if (this.disposed || typeof data === 'string') continue;
      let index = i;
      if (from > 0) {
        const time = times[i];
        if (time === undefined) continue;
        const shifted = time - offset;
        index = this.table.indexAtOrBefore(shifted + TIMESTAMP_TOLERANCE);
        if (Math.abs(this.table.timestamp(index) - shifted) > TIMESTAMP_TOLERANCE) continue;
      }
      if (index >= this.info.frameCount) continue;
      const image = parsePam(data);
      this.store(index, await createImageBitmap(new ImageData(image.pixels, image.width, image.height)));
    }
  }

  private store(index: number, bitmap: ImageBitmap): void {
    this.cache.get(index)?.close();
    this.cache.set(index, bitmap);
    while (this.cache.size > this.capacity) {
      let farthest = index;
      for (const key of this.cache.keys()) {
        if (Math.abs(key - this.lastIndex) > Math.abs(farthest - this.lastIndex)) farthest = key;
      }
      this.cache.get(farthest)?.close();
      this.cache.delete(farthest);
    }
  }
}

const parseNumber = (value: string | undefined) => {
  const number = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(number) ? number : null;
};

export async function openWithFFmpeg(
  file: File,
  onProgress: (progress: OpenProgress) => void,
  signal: AbortSignal,
): Promise<FrameSource> {
  onProgress({ phase: 'loading-engine' });
  const ffmpeg = await getFFmpeg();
  signal.throwIfAborted();

  const mountPoint = `/video${++mountCounter}`;
  await ffmpeg.createDir(mountPoint);
  // WORKERFS reads the file lazily; nothing is copied into memory up front.
  await ffmpeg.mount(FFFSType.WORKERFS, { files: [file] }, mountPoint);
  const path = `${mountPoint}/${file.name}`;
  const cleanUp = () => {
    void ffmpeg
      .unmount(mountPoint)
      .then(() => ffmpeg.deleteDir(mountPoint))
      .catch(() => {});
  };

  try {
    onProgress({ phase: 'reading' });
    const probed = await probe(
      ffmpeg,
      [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name,width,height:stream_side_data=rotation:format=start_time',
        '-of', 'compact',
        path,
      ],
      `${mountPoint}-probe.txt`,
    );
    if (probed === null) throw new VideoOpenError('unsupported-format');
    const entries = parseCompact(probed);
    const stream = entries.find((entry) => entry.width !== undefined);
    const format = entries.find((entry) => entry.start_time !== undefined && entry.width === undefined);
    if (!stream) throw new VideoOpenError('no-video-track');
    signal.throwIfAborted();

    onProgress({ phase: 'indexing' });
    const listed = await probe(
      ffmpeg,
      [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'packet=pts_time,dts_time,duration_time,size',
        '-of', 'compact=p=0',
        path,
      ],
      `${mountPoint}-packets.txt`,
    );
    if (listed === null) throw new VideoOpenError('no-frames');
    const packets: PacketTiming[] = [];
    for (const entry of parseCompact(listed)) {
      // Empty packets (e.g. dropped-frame markers in AVI) produce no picture.
      if (parseNumber(entry.size) === 0) continue;
      const timestamp = parseNumber(entry.pts_time) ?? parseNumber(entry.dts_time);
      if (timestamp !== null) packets.push({ timestamp, duration: parseNumber(entry.duration_time) ?? 0 });
    }
    signal.throwIfAborted();
    const table = FrameTable.fromPackets(packets);
    if (table.count === 0) throw new VideoOpenError('no-frames');

    // ffmpeg applies the rotation metadata, so portrait videos come out portrait.
    const rotation = Math.abs(parseNumber(entries.find((e) => e.rotation !== undefined)?.rotation) ?? 0) % 180;
    const codedWidth = parseNumber(stream.width) ?? 0;
    const codedHeight = parseNumber(stream.height) ?? 0;
    const codec = stream.codec_name ?? '';
    const info: VideoInfo = {
      fileName: file.name,
      width: rotation === 90 ? codedHeight : codedWidth,
      height: rotation === 90 ? codedWidth : codedHeight,
      frameCount: table.count,
      fps: table.averageFrameRate,
      variableFrameRate: table.isVariableRate,
      duration: table.duration,
      codec: CODEC_NAMES[codec] ?? (codec ? codec.toUpperCase() : null),
      engine: 'ffmpeg',
    };
    if (!(info.width > 0 && info.height > 0)) throw new VideoOpenError('no-video-track');
    return new FFmpegSource(info, ffmpeg, mountPoint, path, table, parseNumber(format?.start_time) ?? 0);
  } catch (error) {
    cleanUp();
    throw error;
  }
}
