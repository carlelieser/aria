/**
 * Artist Mapper Utilities
 *
 * Shared utilities for mapping artist references across plugins.
 */

import type { ArtistReference } from '@domain/entities/artist';

/**
 * Default unknown artist reference used when no artist information is available.
 */
export const UNKNOWN_ARTIST: ArtistReference = Object.freeze({
	id: 'unknown',
	name: 'Unknown Artist',
});

/**
 * Minimal interface for artist-like objects from external APIs.
 */
export interface ArtistLike {
	readonly id?: string;
	readonly name: string;
}

/**
 * Maps a single artist-like object to an ArtistReference.
 * Uses the provided ID extractor if given, otherwise falls back to id or name.
 */
export function mapArtistReference<T extends ArtistLike>(
	artist: T,
	idExtractor?: (artist: T) => string
): ArtistReference {
	return {
		id: idExtractor?.(artist) ?? artist.id ?? artist.name,
		name: artist.name,
	};
}

/**
 * Maps an array of artist-like objects to ArtistReferences.
 * Returns UNKNOWN_ARTIST array if input is empty or undefined.
 */
export function mapArtistReferences<T extends ArtistLike>(
	artists: readonly T[] | undefined,
	idExtractor?: (artist: T) => string
): ArtistReference[] {
	if (!artists || artists.length === 0) {
		return [UNKNOWN_ARTIST];
	}

	return artists
		.filter((artist) => artist.name)
		.map((artist) => mapArtistReference(artist, idExtractor));
}

/**
 * Maps an array of artist-like objects to ArtistReferences.
 * Returns an empty array if input is empty (no fallback to unknown artist).
 */
export function mapArtistReferencesStrict<T extends ArtistLike>(
	artists: readonly T[] | undefined,
	idExtractor?: (artist: T) => string
): ArtistReference[] {
	if (!artists || artists.length === 0) {
		return [];
	}

	return artists
		.filter((artist) => artist.name)
		.map((artist) => mapArtistReference(artist, idExtractor));
}
