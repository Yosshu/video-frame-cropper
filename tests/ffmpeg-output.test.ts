import { describe, expect, it } from 'vitest';
import { parseCompact, parsePam, parseShowinfoTimes } from '../src/video/ffmpeg-output';

describe('parseCompact', () => {
  it('reads one entry per line, with or without a section name', () => {
    const text = [
      'stream|codec_name=mpeg4|width=640|height=360',
      'side_data|side_data_type=Display Matrix|rotation=-90',
      'format|start_time=0.000000',
      '',
      'pts_time=0.033333|dts_time=N/A|duration_time=0.033333|size=1234',
    ].join('\n');
    expect(parseCompact(text)).toEqual([
      { codec_name: 'mpeg4', width: '640', height: '360' },
      { side_data_type: 'Display Matrix', rotation: '-90' },
      { start_time: '0.000000' },
      { pts_time: '0.033333', dts_time: 'N/A', duration_time: '0.033333', size: '1234' },
    ]);
  });
});

describe('parseShowinfoTimes', () => {
  it('collects the time of every frame and ignores other log lines', () => {
    const log = [
      "Input #0, avi, from '/video1/clip.avi':",
      '[Parsed_showinfo_0 @ 0x1a2b] config in time_base: 1/30, frame_rate: 30/1',
      '[Parsed_showinfo_0 @ 0x1a2b] n:   0 pts:     17 pts_time:0.566667 duration:      1 duration_time:0.0333333 fmt:yuvj420p',
      '[Parsed_showinfo_0 @ 0x1a2b] n:   1 pts:     18 pts_time:0.6     duration:      1',
      '[Parsed_showinfo_0 @ 0x1a2b] n:   2 pts:     -1 pts_time:-0.0333333 duration:      1',
      'frame=    3 fps=0.0 q=-0.0 Lsize=N/A time=00:00:00.63',
    ];
    expect(parseShowinfoTimes(log)).toEqual([0.566667, 0.6, -0.0333333]);
  });
});

describe('parsePam', () => {
  const pam = (header: string, pixels: number[]) =>
    new Uint8Array([...new TextEncoder().encode(header), ...pixels]);

  it('reads the size and the RGBA pixels', () => {
    const image = parsePam(
      pam('P7\nWIDTH 2\nHEIGHT 1\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n', [1, 2, 3, 255, 4, 5, 6, 255]),
    );
    expect(image.width).toBe(2);
    expect(image.height).toBe(1);
    expect([...image.pixels]).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
  });

  it('rejects other pixel formats and truncated data', () => {
    expect(() => parsePam(pam('P7\nWIDTH 1\nHEIGHT 1\nDEPTH 3\nMAXVAL 255\nENDHDR\n', [1, 2, 3]))).toThrow();
    expect(() => parsePam(pam('P7\nWIDTH 2\nHEIGHT 2\nDEPTH 4\nMAXVAL 255\nENDHDR\n', [1, 2, 3, 4]))).toThrow();
    expect(() => parsePam(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
