import { describe, expect, it } from 'vitest';
import { fitRect, normalizeRect, rectHeight, rectsEqual, rectWidth, toVideoPoint } from '../src/geometry';

const frame = { width: 1920, height: 1080 };

describe('normalizeRect', () => {
  it('accepts corners in any order', () => {
    expect(normalizeRect(740, 530, 100, 50, frame)).toEqual({ x1: 100, y1: 50, x2: 740, y2: 530 });
  });

  it('clamps to the frame (drags that leave the image)', () => {
    expect(normalizeRect(-40, -10, 2500, 1200, frame)).toEqual({ x1: 0, y1: 0, x2: 1920, y2: 1080 });
  });

  it('snaps to whole pixels', () => {
    expect(normalizeRect(10.4, 20.6, 30.5, 40.2, frame)).toEqual({ x1: 10, y1: 21, x2: 31, y2: 40 });
  });

  it('rejects empty selections (a click without dragging)', () => {
    expect(normalizeRect(50, 50, 50, 80, frame)).toBeNull();
    expect(normalizeRect(50, 50, 80, 50.2, frame)).toBeNull();
    expect(normalizeRect(1950, 10, 2000, 20, frame)).toBeNull();
  });

  it('measures width and height with an exclusive end', () => {
    const rect = normalizeRect(100, 50, 740, 530, frame)!;
    expect(rectWidth(rect)).toBe(640);
    expect(rectHeight(rect)).toBe(480);
  });
});

describe('fitRect', () => {
  it('shrinks a selection to a smaller video and drops it if nothing is left', () => {
    expect(fitRect({ x1: 600, y1: 400, x2: 1000, y2: 800 }, { width: 640, height: 480 })).toEqual({
      x1: 600,
      y1: 400,
      x2: 640,
      y2: 480,
    });
    expect(fitRect({ x1: 700, y1: 0, x2: 800, y2: 10 }, { width: 640, height: 480 })).toBeNull();
  });
});

describe('toVideoPoint', () => {
  const box = { left: 100, top: 50, width: 960, height: 540 };

  it('scales display pixels to video pixels', () => {
    expect(toVideoPoint(100, 50, box, frame)).toEqual({ x: 0, y: 0 });
    expect(toVideoPoint(580, 320, box, frame)).toEqual({ x: 960, y: 540 });
    expect(toVideoPoint(1060, 590, box, frame)).toEqual({ x: 1920, y: 1080 });
  });

  it('clamps positions outside the frame', () => {
    expect(toVideoPoint(0, 0, box, frame)).toEqual({ x: 0, y: 0 });
    expect(toVideoPoint(5000, 5000, box, frame)).toEqual({ x: 1920, y: 1080 });
  });
});

describe('rectsEqual', () => {
  it('compares by value', () => {
    expect(rectsEqual({ x1: 1, y1: 2, x2: 3, y2: 4 }, { x1: 1, y1: 2, x2: 3, y2: 4 })).toBe(true);
    expect(rectsEqual({ x1: 1, y1: 2, x2: 3, y2: 4 }, null)).toBe(false);
    expect(rectsEqual(null, null)).toBe(true);
  });
});
