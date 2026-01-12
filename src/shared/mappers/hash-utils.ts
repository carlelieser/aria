/**
 * Hash Utilities
 *
 * Utilities for generating stable hash-based IDs from strings.
 * Useful for creating consistent identifiers for local content.
 */

/**
 * Generates a simple 32-bit hash from a string.
 * Returns the hash as a base36 string.
 */
export function generateStringHash(input: string): string {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		const char = input.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(36);
}

/**
 * Generates a prefixed hash ID from a string.
 */
export function generatePrefixedHashId(input: string, prefix: string): string {
	return `${prefix}_${generateStringHash(input)}`;
}

/**
 * Generates a local track ID from a file path.
 */
export function generateLocalTrackId(filePath: string): string {
	return generatePrefixedHashId(filePath, 'local');
}

/**
 * Generates an album ID from album and artist names.
 */
export function generateLocalAlbumId(albumName: string, artistName: string): string {
	const combined = `${albumName.toLowerCase()}_${artistName.toLowerCase()}`;
	return generatePrefixedHashId(combined, 'album');
}

/**
 * Generates an artist ID from artist name.
 */
export function generateLocalArtistId(artistName: string): string {
	const normalized = artistName.toLowerCase().trim();
	return generatePrefixedHashId(normalized, 'artist');
}
