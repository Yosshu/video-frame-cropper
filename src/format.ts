/** Formats seconds as m:ss.mmm (or h:mm:ss.mmm for an hour or more). */
export function formatTime(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  const tail = `${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${tail}` : `${m}:${tail}`;
}

/** Formats a frame rate with at most three decimals: 30, 29.97, 23.976. */
export function formatFps(fps: number): string {
  return String(Math.round(fps * 1000) / 1000);
}
