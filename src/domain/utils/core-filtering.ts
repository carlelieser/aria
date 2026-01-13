/**
 * Core Filtering Utilities
 *
 * Shared filtering primitives used across library and search filtering.
 * Pure TypeScript utilities - domain layer only.
 */

import type { ArtistReference } from '../entities/artist';
import type { AlbumReference } from '../entities/album';

/**
 * Base filter interface for track-based filtering.
 * Extended by LibraryFilters and SearchFilters.
 */
export interface BaseFilters {
	readonly favoritesOnly: boolean;
	readonly artistIds: string[];
	readonly albumIds: string[];
}

/**
 * Minimal interface for items that can be filtered.
 * Uses structural typing to work with Track and similar types.
 */
export interface Filterable {
	readonly id: { readonly value: string };
	readonly artists: readonly ArtistReference[];
	readonly album?: { readonly id: string };
}

/**
 * Minimal interface for items with artists.
 */
export interface HasArtists {
	readonly artists: readonly ArtistReference[];
}

/**
 * Minimal interface for items with an album.
 */
export interface HasAlbum {
	readonly album?: AlbumReference;
}

/**
 * Gets the primary artist name from an item with artists.
 */
export function getPrimaryArtistName<T extends HasArtists>(item: T): string {
	return item.artists[0]?.name ?? '';
}

/**
 * Checks if an item matches the base filter criteria.
 * Used as the foundation for both library and search filtering.
 */
export function matchesBaseFilters<T extends Filterable>(
	item: T,
	filters: BaseFilters,
	favoriteIds: Set<string>
): boolean {
	if (filters.favoritesOnly && !favoriteIds.has(item.id.value)) {
		return false;
	}

	if (filters.artistIds.length > 0) {
		const itemArtistIds = item.artists.map((a) => a.id);
		const hasMatchingArtist = filters.artistIds.some((id) => itemArtistIds.includes(id));
		if (!hasMatchingArtist) {
			return false;
		}
	}

	if (filters.albumIds.length > 0) {
		if (!item.album || !filters.albumIds.includes(item.album.id)) {
			return false;
		}
	}

	return true;
}

/**
 * Extracts unique artists from a collection of items with artists.
 * Returns sorted by name.
 */
export function extractUniqueArtistsFromItems<T extends HasArtists>(
	items: readonly T[]
): ArtistReference[] {
	const artistMap = new Map<string, ArtistReference>();

	for (const item of items) {
		for (const artist of item.artists) {
			if (!artistMap.has(artist.id)) {
				artistMap.set(artist.id, artist);
			}
		}
	}

	return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extracts unique albums from a collection of items with albums.
 * Returns sorted by name.
 */
export function extractUniqueAlbumsFromItems<T extends HasAlbum>(
	items: readonly T[]
): AlbumReference[] {
	const albumMap = new Map<string, AlbumReference>();

	for (const item of items) {
		if (item.album && !albumMap.has(item.album.id)) {
			albumMap.set(item.album.id, item.album);
		}
	}

	return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Counts active base filters (favorites + artist count + album count).
 */
export function countBaseActiveFilters(filters: BaseFilters): number {
	let count = 0;
	if (filters.favoritesOnly) count += 1;
	count += filters.artistIds.length;
	count += filters.albumIds.length;
	return count;
}

/**
 * Checks if any base filters are active.
 */
export function hasBaseActiveFilters(filters: BaseFilters): boolean {
	return filters.favoritesOnly || filters.artistIds.length > 0 || filters.albumIds.length > 0;
}
