export type SourceType = 'youtube-music' | 'local-file' | 'spotify' | 'apple-music' | string;

export class TrackId {
	private constructor(
		public readonly value: string,

		public readonly sourceType: SourceType,

		public readonly sourceId: string
	) {
		Object.freeze(this);
	}

	static create(sourceType: SourceType, sourceId: string): TrackId {
		const value = `${sourceType}:${sourceId}`;
		return new TrackId(value, sourceType, sourceId);
	}

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

	static tryFromString(value: string): TrackId | null {
		try {
			return TrackId.fromString(value);
		} catch {
			return null;
		}
	}

	equals(other: TrackId): boolean {
		return this.value === other.value;
	}

	isFromSource(sourceType: SourceType): boolean {
		return this.sourceType === sourceType;
	}

	toString(): string {
		return this.value;
	}

	toJSON(): string {
		return this.value;
	}
}

export function isValidTrackIdString(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	const colonIndex = value.indexOf(':');
	return colonIndex > 0 && colonIndex < value.length - 1;
}

/**
 * Safely extracts the string value from a TrackId.
 * Handles both TrackId instances and plain strings (from deserialization).
 */
export function getTrackIdString(id: TrackId | string): string {
	return typeof id === 'string' ? id : id.value;
}
