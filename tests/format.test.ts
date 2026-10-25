import { describe, expect, it } from 'vitest';
import { formatFps, formatTime } from '../src/format';

describe('formatTime', () => {
  it('formats minutes, seconds and milliseconds', () => {
    expect(formatTime(0)).toBe('0:00.000');
    expect(formatTime(4.0333333)).toBe('0:04.033');
    expect(formatTime(75.5)).toBe('1:15.500');
    expect(formatTime(3725.25)).toBe('1:02:05.250');
  });

  it('rounds to the nearest millisecond and never goes negative', () => {
    expect(formatTime(59.9996)).toBe('1:00.000');
    expect(formatTime(-0.2)).toBe('0:00.000');
  });
});

describe('formatFps', () => {
  it('keeps at most three decimals', () => {
    expect(formatFps(30)).toBe('30');
    expect(formatFps(30000 / 1001)).toBe('29.97');
    expect(formatFps(24000 / 1001)).toBe('23.976');
  });
});
