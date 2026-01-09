/**
 * Source type for track identification
 */
export type SourceType = 'youtube-music' | 'local-file' | 'spotify' | 'apple-music' | string;

/**
 * TrackId is a composite identifier that combines the source system
 * with the source-specific ID. This enables cross-source identification
 * and prevents ID collisions.
 *
 * Format: "source:id" (e.g., "youtube-music:dQw4w9WgXcQ")
 */
export class TrackId {
  private constructor(
    /** The combined identifier string */
    public readonly value: string,
    /** The source system */
    public readonly sourceType: SourceType,
    /** The ID within the source system */
    public readonly sourceId: string
  ) {
    Object.freeze(this);
  }

  /**
   * Create a TrackId from source type and source ID
   */
  static create(sourceType: SourceType, sourceId: string): TrackId {
    const value = `${sourceType}:${sourceId}`;
    return new TrackId(value, sourceType, sourceId);
  }

  /**
   * Parse a TrackId from its string representation
   */
  static fromString(value: string): TrackId {
    const colonIndex = value.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid TrackId format: ${value}. Expected "source:id" format.`);
    }

    const sourceType = value.substring(0, colonIndex) as SourceType;
    const sourceId = value.substring(colonIndex + 1);

    if (!sourceType || !sourceId) {
      throw new Error(`Invalid TrackId format: ${value}. Both source and id are required.`);
    }

    return new TrackId(value, sourceType, sourceId);
  }

  /**
   * Try to parse a TrackId, returning null if invalid
   */
  static tryFromString(value: string): TrackId | null {
    try {
      return TrackId.fromString(value);
    } catch {
      return null;
    }
  }

  /**
   * Check if two TrackIds are equal
   */
  equals(other: TrackId): boolean {
    return this.value === other.value;
  }

  /**
   * Check if this track is from a specific source
   */
  isFromSource(sourceType: SourceType): boolean {
    return this.sourceType === sourceType;
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * JSON serialization
   */
  toJSON(): string {
    return this.value;
  }
}

/**
 * Type guard to check if a value is a valid TrackId string
 */
export function isValidTrackIdString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const colonIndex = value.indexOf(':');
  return colonIndex > 0 && colonIndex < value.length - 1;
}
