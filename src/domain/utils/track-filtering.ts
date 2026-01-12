import type { Track } from '../entities/track';
import type { ArtistReference } from '../entities/artist';
import type { AlbumReference } from '../entities/album';
import {
	getPrimaryArtistName,
	matchesBaseFilters,
	extractUniqueArtistsFromItems,
	extractUniqueAlbumsFromItems,
	countBaseActiveFilters,
	hasBaseActiveFilters,
	type BaseFilters,
} from './core-filtering';

export type SortField = 'title' | 'artist' | 'dateAdded' | 'duration';
export type SortDirection = 'asc' | 'desc';

export interface LibraryFilters extends BaseFilters {
	readonly downloadedOnly: boolean;
}

export const DEFAULT_FILTERS: LibraryFilters = {
	artistIds: [],
	albumIds: [],
	favoritesOnly: false,
	downloadedOnly: false,
};

export function sortTracks(
	tracks: readonly Track[],
	field: SortField,
	direction: SortDirection
): Track[] {
	const sorted = [...tracks].sort((a, b) => compareTracks(a, b, field));
	return direction === 'desc' ? sorted.reverse() : sorted;
}

export function compareTracks(a: Track, b: Track, field: SortField): number {
	switch (field) {
		case 'title':
			return a.title.localeCompare(b.title);
		case 'artist':
			return getPrimaryArtistName(a).localeCompare(getPrimaryArtistName(b));
		case 'dateAdded':
			return compareDates(a.addedAt, b.addedAt);
		case 'duration':
			return a.duration.totalMilliseconds - b.duration.totalMilliseconds;
		default:
			return 0;
	}
}

function compareDates(a: Date | undefined, b: Date | undefined): number {
	if (!a && !b) return 0;
	if (!a) return 1;
	if (!b) return -1;
	return a.getTime() - b.getTime();
}

export function filterTracks(
	tracks: readonly Track[],
	searchQuery: string,
	filters: LibraryFilters,
	favoriteIds: Set<string>
): Track[] {
	const query = searchQuery.trim().toLowerCase();

	return tracks.filter((track) => {
		if (query && !matchesSearch(track, query)) {
			return false;
		}
		return matchesFilters(track, filters, favoriteIds);
	});
}

export function matchesSearch(track: Track, query: string): boolean {
	const lowerQuery = query.toLowerCase();

	if (track.title.toLowerCase().includes(lowerQuery)) {
		return true;
	}

	if (track.artists.some((a) => a.name.toLowerCase().includes(lowerQuery))) {
		return true;
	}

	if (track.album?.name.toLowerCase().includes(lowerQuery)) {
		return true;
	}

	return false;
}

export function matchesFilters(
	track: Track,
	filters: LibraryFilters,
	favoriteIds: Set<string>
): boolean {
	return matchesBaseFilters(track, filters, favoriteIds);
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
	return hasBaseActiveFilters(filters) || filters.downloadedOnly;
}

export function countActiveFilters(filters: LibraryFilters): number {
	let count = countBaseActiveFilters(filters);
	if (filters.downloadedOnly) count += 1;
	return count;
}

export function extractUniqueArtists(tracks: readonly Track[]): ArtistReference[] {
	return extractUniqueArtistsFromItems(tracks);
}

export function extractUniqueAlbums(tracks: readonly Track[]): AlbumReference[] {
	return extractUniqueAlbumsFromItems(tracks);
}
