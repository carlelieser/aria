import { ok, err, type Result } from '@shared/types/result';

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

	static fromString(value: string): Result<TrackId, Error> {
		const colonIndex = value.indexOf(':');
		if (colonIndex === -1) {
			return err(new Error(`Invalid TrackId format: ${value}. Expected "source:id" format.`));
		}

		const sourceType = value.substring(0, colonIndex) as SourceType;
		const sourceId = value.substring(colonIndex + 1);

		if (!sourceType || !sourceId) {
			return err(
				new Error(`Invalid TrackId format: ${value}. Both source and id are required.`)
			);
		}

		return ok(new TrackId(value, sourceType, sourceId));
	}

	static tryFromString(value: string): TrackId | null {
		const result = TrackId.fromString(value);
		return result.success ? result.data : null;
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
