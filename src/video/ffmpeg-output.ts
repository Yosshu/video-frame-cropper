/** Parsers for the text and images that ffmpeg / ffprobe produce. */

/** Parses ffprobe's "compact" output: one line per entry, `key=value|key=value`. */
export function parseCompact(text: string): Record<string, string>[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const entry: Record<string, string> = {};
      for (const field of line.trim().split('|')) {
        const eq = field.indexOf('=');
        if (eq > 0) entry[field.slice(0, eq)] = field.slice(eq + 1);
      }
      return entry;
    });
}

/** Presentation times of the frames ffmpeg wrote, in order, from the `showinfo` filter's log. */
export function parseShowinfoTimes(log: readonly string[]): number[] {
  const times: number[] = [];
  for (const line of log) {
    const match = /\bn:\s*\d+\s+pts:\s*-?\d+\s+pts_time:(-?[\d.]+(?:e-?\d+)?)/.exec(line);
    if (match) times.push(Number(match[1]));
  }
  return times;
}

export interface RgbaImage {
  width: number;
  height: number;
  pixels: Uint8ClampedArray<ArrayBuffer>;
}

/** Reads a binary PAM image (`-c:v pam -pix_fmt rgba`). */
export function parsePam(bytes: Uint8Array): RgbaImage {
  const headerEnd = findHeaderEnd(bytes);
  const header = new TextDecoder().decode(bytes.subarray(0, headerEnd));
  const value = (key: string) => Number(new RegExp(`^${key}\\s+(\\d+)`, 'm').exec(header)?.[1]);
  const width = value('WIDTH');
  const height = value('HEIGHT');
  if (!(width > 0 && height > 0) || value('DEPTH') !== 4) throw new Error('Unexpected PAM header');
  const pixels = new Uint8ClampedArray(width * height * 4);
  if (bytes.length - headerEnd < pixels.length) throw new Error('PAM image is truncated');
  pixels.set(bytes.subarray(headerEnd, headerEnd + pixels.length));
  return { width, height, pixels };
}

function findHeaderEnd(bytes: Uint8Array): number {
  const marker = new TextEncoder().encode('ENDHDR\n');
  for (let i = 0; i + marker.length <= Math.min(bytes.length, 512); i++) {
    if (marker.every((byte, j) => bytes[i + j] === byte)) return i + marker.length;
  }
  throw new Error('PAM header not found');
}
