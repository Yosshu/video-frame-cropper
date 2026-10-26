import { describe, expect, it } from 'vitest';
import { baseName, outputFileName, padFrameNumber, sanitizeFileName } from '../src/export';

describe('baseName', () => {
  it('removes only the last extension', () => {
    expect(baseName('運動会.mp4')).toBe('運動会');
    expect(baseName('clip.final.MOV')).toBe('clip.final');
    expect(baseName('noext')).toBe('noext');
    expect(baseName('.hidden')).toBe('.hidden');
  });
});

describe('sanitizeFileName', () => {
  it('replaces characters that are not allowed in file names', () => {
    expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
    expect(sanitizeFileName('tab\there')).toBe('tab_here');
  });

  it('keeps Japanese and other Unicode text', () => {
    expect(sanitizeFileName('運動会 2026 🎉')).toBe('運動会 2026 🎉');
  });

  it('removes trailing dots and spaces (not allowed on Windows)', () => {
    expect(sanitizeFileName('name. . ')).toBe('name');
  });

  it('shortens very long names without splitting characters', () => {
    const long = '動'.repeat(150);
    expect([...sanitizeFileName(long)]).toHaveLength(100);
  });

  it('never returns an empty name', () => {
    expect(sanitizeFileName('...')).toBe('video');
    expect(sanitizeFileName('')).toBe('video');
  });
});

describe('padFrameNumber', () => {
  it('pads to the width of the last frame number', () => {
    expect(padFrameNumber(5, 3600)).toBe('0005');
    expect(padFrameNumber(120, 3600)).toBe('0120');
    expect(padFrameNumber(5, 10)).toBe('5');
    expect(padFrameNumber(5, 11)).toBe('05');
    expect(padFrameNumber(0, 1)).toBe('0');
  });
});

describe('outputFileName', () => {
  it('includes the video name, frame and region', () => {
    expect(
      outputFileName({
        videoFileName: '運動会.mp4',
        index: 120,
        frameCount: 3600,
        rect: { x1: 100, y1: 50, x2: 740, y2: 530 },
        format: 'jpeg',
      }),
    ).toBe('運動会_f0120_x100_y50_x740_y530.jpg');
  });

  it('omits the region when the whole frame is saved', () => {
    expect(
      outputFileName({ videoFileName: 'clip.mov', index: 7, frameCount: 300, rect: null, format: 'png' }),
    ).toBe('clip_f007.png');
  });

  it('uses the extension of the chosen format', () => {
    expect(
      outputFileName({ videoFileName: 'a:b.webm', index: 0, frameCount: 1, rect: null, format: 'webp' }),
    ).toBe('a_b_f0.webp');
  });
});
