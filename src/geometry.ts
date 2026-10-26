/**
 * A crop region in video pixels. (x1, y1) is the top-left pixel and (x2, y2) is exclusive, like
 * array slicing `frame[y1:y2, x1:x2]`, so the size is (x2 - x1) × (y2 - y1).
 */
export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Size {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function rectWidth(rect: Rect): number {
  return rect.x2 - rect.x1;
}

export function rectHeight(rect: Rect): number {
  return rect.y2 - rect.y1;
}

/**
 * Turns two corners in any order into a rectangle that lies inside the frame, with whole-pixel
 * edges. Returns null when nothing would be left (zero width or height).
 */
export function normalizeRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  frame: Size,
): Rect | null {
  const x1 = clamp(Math.round(Math.min(ax, bx)), 0, frame.width);
  const x2 = clamp(Math.round(Math.max(ax, bx)), 0, frame.width);
  const y1 = clamp(Math.round(Math.min(ay, by)), 0, frame.height);
  const y2 = clamp(Math.round(Math.max(ay, by)), 0, frame.height);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x1, y1, x2, y2 };
}

/** Keeps a selection that was made on another video inside this video's frame. */
export function fitRect(rect: Rect, frame: Size): Rect | null {
  return normalizeRect(rect.x1, rect.y1, rect.x2, rect.y2, frame);
}

/**
 * Converts a pointer position on the displayed frame (CSS pixels relative to the page) into
 * continuous video pixel coordinates, clamped to the frame.
 */
export function toVideoPoint(
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
  frame: Size,
): { x: number; y: number } {
  const x = ((clientX - box.left) / box.width) * frame.width;
  const y = ((clientY - box.top) / box.height) * frame.height;
  return { x: clamp(x, 0, frame.width), y: clamp(y, 0, frame.height) };
}

export function rectsEqual(a: Rect | null, b: Rect | null): boolean {
  if (a === null || b === null) return a === b;
  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2;
}
