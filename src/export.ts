import { rectHeight, rectWidth, type Rect } from './geometry';

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export const IMAGE_FORMATS: Record<ImageFormat, { mime: string; extension: string; lossy: boolean }> = {
  jpeg: { mime: 'image/jpeg', extension: 'jpg', lossy: true },
  png: { mime: 'image/png', extension: 'png', lossy: false },
  webp: { mime: 'image/webp', extension: 'webp', lossy: true },
};

const MAX_BASE_NAME_LENGTH = 100;

/** The file name without its extension: "clip.final.mp4" → "clip.final". */
export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

/**
 * Makes a name safe on Windows, macOS and Linux: characters that are not allowed in file names
 * become "_", trailing dots and spaces are removed, and very long names are shortened.
 */
export function sanitizeFileName(name: string): string {
  let safe = name.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_').replace(/[. ]+$/, '');
  const chars = [...safe];
  if (chars.length > MAX_BASE_NAME_LENGTH) safe = chars.slice(0, MAX_BASE_NAME_LENGTH).join('');
  return safe.trim() === '' ? 'video' : safe;
}

/** Zero-pads the frame number to the width of the last frame number, so files sort in order. */
export function padFrameNumber(index: number, frameCount: number): string {
  const width = String(Math.max(0, frameCount - 1)).length;
  return String(index).padStart(width, '0');
}

/**
 * "<video name>_f<frame>_x<x1>_y<y1>_x<x2>_y<y2>.<ext>", or "<video name>_f<frame>.<ext>" when the
 * whole frame is saved.
 */
export function outputFileName(options: {
  videoFileName: string;
  index: number;
  frameCount: number;
  rect: Rect | null;
  format: ImageFormat;
}): string {
  const { videoFileName, index, frameCount, rect, format } = options;
  const parts = [sanitizeFileName(baseName(videoFileName)), `f${padFrameNumber(index, frameCount)}`];
  if (rect) parts.push(`x${rect.x1}`, `y${rect.y1}`, `x${rect.x2}`, `y${rect.y2}`);
  return `${parts.join('_')}.${IMAGE_FORMATS[format].extension}`;
}

/** Copies the region (or the whole frame) at full resolution and encodes it. */
export async function encodeCrop(
  source: HTMLCanvasElement,
  rect: Rect | null,
  format: ImageFormat,
  quality: number,
): Promise<Blob> {
  const region = rect ?? { x1: 0, y1: 0, x2: source.width, y2: source.height };
  const width = rectWidth(region);
  const height = rectHeight(region);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is not available');
  ctx.drawImage(source, region.x1, region.y1, width, height, 0, 0, width, height);

  const { mime, lossy } = IMAGE_FORMATS[format];
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, lossy ? quality / 100 : undefined),
  );
  if (!blob) throw new Error('Image encoding failed');
  // Browsers that cannot encode a format silently fall back to PNG.
  if (blob.type !== mime) throw new Error(`This browser cannot encode ${mime}`);
  return blob;
}

/** True if the browser can encode `format` (Safari, for example, cannot write WebP). */
export function canEncode(format: ImageFormat): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  return canvas.toDataURL(IMAGE_FORMATS[format].mime).startsWith(`data:${IMAGE_FORMATS[format].mime}`);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
