import { describe, expect, it } from 'vitest';
import { FrameTable } from '../src/video/frame-table';

const cfr = (count: number, fps: number, offset = 0) =>
  Array.from({ length: count }, (_, i) => ({ timestamp: offset + i / fps, duration: 1 / fps }));

describe('FrameTable', () => {
  it('orders frames by presentation time (B-frames arrive in decode order)', () => {
    const decodeOrder = [0, 3, 1, 2, 6, 4, 5].map((i) => ({ timestamp: i / 30, duration: 1 / 30 }));
    const table = FrameTable.fromPackets(decodeOrder);
    expect(table.count).toBe(7);
    for (let i = 0; i < 7; i++) expect(table.timestamp(i)).toBeCloseTo(i / 30, 12);
  });

  it('queries the midpoint of each frame so rounding cannot select a neighbour', () => {
    const table = FrameTable.fromPackets(cfr(3, 30));
    expect(table.queryTime(0)).toBeCloseTo(0.5 / 30, 12);
    expect(table.queryTime(1)).toBeCloseTo(1.5 / 30, 12);
    expect(table.queryTime(2)).toBeCloseTo(2.5 / 30, 12);
  });

  it('handles variable frame rates', () => {
    const table = FrameTable.fromPackets([
      { timestamp: 0, duration: 0.1 },
      { timestamp: 0.1, duration: 0.5 },
      { timestamp: 0.6, duration: 0.05 },
    ]);
    expect(table.queryTime(1)).toBeCloseTo(0.35, 12);
    expect(table.queryTime(2)).toBeCloseTo(0.625, 12);
    expect(table.duration).toBeCloseTo(0.65, 12);
  });

  it('drops frames that end before time zero (edit-list trimming)', () => {
    const packets = [
      { timestamp: -2 / 30, duration: 1 / 30 },
      { timestamp: -1 / 30, duration: 1 / 30 },
      ...cfr(3, 30),
    ];
    const table = FrameTable.fromPackets(packets);
    expect(table.count).toBe(3);
    expect(table.timestamp(0)).toBe(0);
  });

  it('keeps all frames if every frame would be dropped', () => {
    const table = FrameTable.fromPackets([{ timestamp: -1, duration: 0.5 }]);
    expect(table.count).toBe(1);
  });

  it('measures times from the first frame and computes the average frame rate', () => {
    const table = FrameTable.fromPackets(cfr(301, 30000 / 1001, 1.4));
    expect(table.relativeTime(0)).toBe(0);
    expect(table.relativeTime(300)).toBeCloseTo(300 * (1001 / 30000), 9);
    expect(table.averageFrameRate).toBeCloseTo(29.97, 2);
    expect(FrameTable.fromPackets(cfr(1, 30)).averageFrameRate).toBeNull();
  });

  it('ignores duplicate timestamps', () => {
    const table = FrameTable.fromPackets([...cfr(2, 30), { timestamp: 1 / 30, duration: 1 / 30 }]);
    expect(table.count).toBe(2);
  });

  it('throws for frame numbers out of range', () => {
    const table = FrameTable.fromPackets(cfr(2, 30));
    expect(() => table.timestamp(2)).toThrow(RangeError);
    expect(() => table.queryTime(-1)).toThrow(RangeError);
  });
});
