/**
 * Duration value object representing a time span.
 * Immutable and provides formatting utilities.
 */
export class Duration {
  private constructor(
    /** Total duration in milliseconds */
    public readonly totalMilliseconds: number
  ) {
    Object.freeze(this);
  }

  /**
   * Create a Duration from milliseconds
   */
  static fromMilliseconds(ms: number): Duration {
    return new Duration(Math.max(0, Math.round(ms)));
  }

  /**
   * Create a Duration from seconds
   */
  static fromSeconds(seconds: number): Duration {
    return Duration.fromMilliseconds(seconds * 1000);
  }

  /**
   * Create a Duration from minutes
   */
  static fromMinutes(minutes: number): Duration {
    return Duration.fromMilliseconds(minutes * 60 * 1000);
  }

  /**
   * Create a Duration from hours, minutes, and seconds
   */
  static fromHMS(hours: number, minutes: number, seconds: number): Duration {
    return Duration.fromMilliseconds(
      (hours * 3600 + minutes * 60 + seconds) * 1000
    );
  }

  /**
   * Parse a duration string (e.g., "3:45", "1:23:45")
   */
  static parse(value: string): Duration {
    const parts = value.split(':').map(Number);

    if (parts.some(isNaN)) {
      throw new Error(`Invalid duration format: ${value}`);
    }

    if (parts.length === 2) {
      // MM:SS
      const [minutes, seconds] = parts;
      return Duration.fromHMS(0, minutes, seconds);
    } else if (parts.length === 3) {
      // HH:MM:SS
      const [hours, minutes, seconds] = parts;
      return Duration.fromHMS(hours, minutes, seconds);
    }

    throw new Error(`Invalid duration format: ${value}. Expected MM:SS or HH:MM:SS.`);
  }

  /**
   * Try to parse a duration string, returning null if invalid
   */
  static tryParse(value: string): Duration | null {
    try {
      return Duration.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * Zero duration constant
   */
  static readonly ZERO = new Duration(0);

  /**
   * Get total seconds
   */
  get totalSeconds(): number {
    return Math.floor(this.totalMilliseconds / 1000);
  }

  /**
   * Get total minutes
   */
  get totalMinutes(): number {
    return Math.floor(this.totalMilliseconds / 60000);
  }

  /**
   * Get total hours
   */
  get totalHours(): number {
    return Math.floor(this.totalMilliseconds / 3600000);
  }

  /**
   * Get the hours component
   */
  get hours(): number {
    return Math.floor(this.totalMilliseconds / 3600000);
  }

  /**
   * Get the minutes component (0-59)
   */
  get minutes(): number {
    return Math.floor((this.totalMilliseconds % 3600000) / 60000);
  }

  /**
   * Get the seconds component (0-59)
   */
  get seconds(): number {
    return Math.floor((this.totalMilliseconds % 60000) / 1000);
  }

  /**
   * Get the milliseconds component (0-999)
   */
  get milliseconds(): number {
    return this.totalMilliseconds % 1000;
  }

  /**
   * Format as MM:SS or HH:MM:SS (for durations >= 1 hour)
   */
  format(): string {
    const h = this.hours;
    const m = this.minutes;
    const s = this.seconds;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (h > 0) {
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${m}:${pad(s)}`;
  }

  /**
   * Format with explicit hours (HH:MM:SS)
   */
  formatLong(): string {
    const h = this.hours;
    const m = this.minutes;
    const s = this.seconds;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  /**
   * Format as human-readable string (e.g., "3 min 45 sec")
   */
  formatHuman(): string {
    const h = this.hours;
    const m = this.minutes;
    const s = this.seconds;

    const parts: string[] = [];
    if (h > 0) parts.push(`${h} hr`);
    if (m > 0) parts.push(`${m} min`);
    if (s > 0 || parts.length === 0) parts.push(`${s} sec`);

    return parts.join(' ');
  }

  /**
   * Add another duration
   */
  add(other: Duration): Duration {
    return Duration.fromMilliseconds(this.totalMilliseconds + other.totalMilliseconds);
  }

  /**
   * Subtract another duration
   */
  subtract(other: Duration): Duration {
    return Duration.fromMilliseconds(this.totalMilliseconds - other.totalMilliseconds);
  }

  /**
   * Multiply by a factor
   */
  multiply(factor: number): Duration {
    return Duration.fromMilliseconds(this.totalMilliseconds * factor);
  }

  /**
   * Check if this duration equals another
   */
  equals(other: Duration): boolean {
    return this.totalMilliseconds === other.totalMilliseconds;
  }

  /**
   * Check if this duration is greater than another
   */
  greaterThan(other: Duration): boolean {
    return this.totalMilliseconds > other.totalMilliseconds;
  }

  /**
   * Check if this duration is less than another
   */
  lessThan(other: Duration): boolean {
    return this.totalMilliseconds < other.totalMilliseconds;
  }

  /**
   * Check if duration is zero
   */
  isZero(): boolean {
    return this.totalMilliseconds === 0;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.format();
  }

  /**
   * JSON serialization (as milliseconds)
   */
  toJSON(): number {
    return this.totalMilliseconds;
  }
}
