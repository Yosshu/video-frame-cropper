export interface PacketTiming {
  /** Presentation timestamp in seconds. */
  timestamp: number;
  /** Duration in seconds (0 when unknown). */
  duration: number;
}

/**
 * Maps frame numbers (0-based, in presentation order) to presentation timestamps.
 *
 * Packets come out of a container in decode order, which differs from display order when the
 * video uses B-frames, so the timestamps are sorted. Frames that end at or before time zero are
 * dropped: containers use them to trim encoder priming and players never show them.
 */
export class FrameTable {
  private constructor(
    private readonly timestamps: Float64Array,
    private readonly lastDuration: number,
  ) {}

  static fromPackets(packets: readonly PacketTiming[]): FrameTable {
    let visible = packets.filter((p) => p.timestamp + p.duration > 0);
    if (visible.length === 0) visible = [...packets];
    visible.sort((a, b) => a.timestamp - b.timestamp);

    const timestamps: number[] = [];
    let lastDuration = 0;
    for (const packet of visible) {
      if (timestamps.length > 0 && packet.timestamp === timestamps[timestamps.length - 1]) continue;
      timestamps.push(packet.timestamp);
      lastDuration = packet.duration;
    }
    return new FrameTable(Float64Array.from(timestamps), lastDuration);
  }

  get count(): number {
    return this.timestamps.length;
  }

  timestamp(index: number): number {
    return this.at(index);
  }

  /** Seconds from the first frame, for display. */
  relativeTime(index: number): number {
    return this.at(index) - this.at(0);
  }

  /**
   * A timestamp that unambiguously selects frame `index` when asking a decoder for "the last frame
   * starting at or before t": the midpoint between this frame and the next one. Querying the exact
   * start could pick the previous frame because of rounding to microseconds inside decoders.
   */
  queryTime(index: number): number {
    const start = this.at(index);
    if (index + 1 < this.count) return (start + this.at(index + 1)) / 2;
    return start + (this.lastDuration > 0 ? this.lastDuration / 2 : 0.001);
  }

  /** Total length from the start of the first frame to the end of the last one, in seconds. */
  get duration(): number {
    if (this.count === 0) return 0;
    return this.at(this.count - 1) + this.lastDuration - this.at(0);
  }

  /** Average frame rate over the whole video, or null when it cannot be determined. */
  get averageFrameRate(): number | null {
    if (this.count < 2) return null;
    const span = this.at(this.count - 1) - this.at(0);
    return span > 0 ? (this.count - 1) / span : null;
  }

  private at(index: number): number {
    const value = this.timestamps[index];
    if (value === undefined) throw new RangeError(`Frame ${index} is out of range (0-${this.count - 1})`);
    return value;
  }
}
