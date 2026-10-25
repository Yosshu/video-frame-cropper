import { openWithMediabunny } from './mediabunny-source';
import { VideoOpenError, type FrameSource, type OpenProgress } from './types';

export async function openVideo(
  file: File,
  onProgress: (progress: OpenProgress) => void,
  signal: AbortSignal,
): Promise<FrameSource> {
  try {
    return await openWithMediabunny(file, onProgress, signal);
  } catch (error) {
    if (error instanceof VideoOpenError || signal.aborted) throw error;
    throw new VideoOpenError('read-failed', error instanceof Error ? error.message : String(error), { cause: error });
  }
}
