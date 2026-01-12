export type AlbumSourceType =
	| 'youtube-music'
	| 'local-library'
	| 'spotify'
	| 'apple-music'
	| string;

export class AlbumId {
	private constructor(
		public readonly value: string,

		public readonly sourceType: AlbumSourceType,

		public readonly sourceId: string
	) {
		Object.freeze(this);
	}

	static create(sourceType: AlbumSourceType, sourceId: string): AlbumId {
		const value = `${sourceType}:${sourceId}`;
		return new AlbumId(value, sourceType, sourceId);
	}

	static fromString(value: string): AlbumId {
		const colonIndex = value.indexOf(':');
		if (colonIndex === -1) {
			throw new Error(`Invalid AlbumId format: ${value}. Expected "source:id" format.`);
		}

		const sourceType = value.substring(0, colonIndex) as AlbumSourceType;
		const sourceId = value.substring(colonIndex + 1);

		if (!sourceType || !sourceId) {
			throw new Error(`Invalid AlbumId format: ${value}. Both source and id are required.`);
		}

		return new AlbumId(value, sourceType, sourceId);
	}

	static tryFromString(value: string): AlbumId | null {
		try {
			return AlbumId.fromString(value);
		} catch {
			return null;
		}
	}

	equals(other: AlbumId): boolean {
		return this.value === other.value;
	}

	isFromSource(sourceType: AlbumSourceType): boolean {
		return this.sourceType === sourceType;
	}

	toString(): string {
		return this.value;
	}

	toJSON(): string {
		return this.value;
	}
}

export function isValidAlbumIdString(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	const colonIndex = value.indexOf(':');
	return colonIndex > 0 && colonIndex < value.length - 1;
}

/**
 * Safely extracts the string value from an AlbumId.
 * Handles both AlbumId instances and plain strings (from deserialization).
 */
export function getAlbumIdString(id: AlbumId | string): string {
	return typeof id === 'string' ? id : id.value;
}
