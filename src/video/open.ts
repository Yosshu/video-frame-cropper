import { openWithMediabunny } from './mediabunny-source';
import { VideoOpenError, type FrameSource, type OpenProgress } from './types';

/** Files that are certainly not videos are not worth loading the ffmpeg fallback for. */
function clearlyNotVideo(file: File): boolean {
  return /^(text|image|audio|font)\//.test(file.type) || /^application\/(pdf|json|zip)/.test(file.type);
}

/**
 * Opens a video with the browser's own decoders when possible (fast, exact frames) and falls back
 * to ffmpeg.wasm for containers and codecs the browser cannot handle, such as AVI.
 */
export async function openVideo(
  file: File,
  onProgress: (progress: OpenProgress) => void,
  signal: AbortSignal,
): Promise<FrameSource> {
  let firstError: VideoOpenError;
  try {
    return await openWithMediabunny(file, onProgress, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    firstError =
      error instanceof VideoOpenError
        ? error
        : new VideoOpenError('read-failed', error instanceof Error ? error.message : String(error), { cause: error });
  }
  if (firstError.code === 'no-video-track' || clearlyNotVideo(file)) throw firstError;

  try {
    const { openWithFFmpeg } = await import('./ffmpeg-source');
    return await openWithFFmpeg(file, onProgress, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    console.error('ffmpeg fallback failed', error);
    // ffmpeg's own diagnosis wins when it has one; otherwise report why the browser could not read it.
    throw error instanceof VideoOpenError && error.code !== 'unsupported-format' ? error : firstError;
  }
}
