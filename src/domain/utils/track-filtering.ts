import type { Track } from '../entities/track';
import type { ArtistReference } from '../entities/artist';
import type { AlbumReference } from '../entities/album';

export type SortField = 'title' | 'artist' | 'dateAdded' | 'duration';
export type SortDirection = 'asc' | 'desc';

export interface LibraryFilters {
	readonly artistIds: string[];
	readonly albumIds: string[];
	readonly favoritesOnly: boolean;
}

export const DEFAULT_FILTERS: LibraryFilters = {
	artistIds: [],
	albumIds: [],
	favoritesOnly: false,
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

function getPrimaryArtistName(track: Track): string {
	return track.artists[0]?.name ?? '';
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
	if (filters.favoritesOnly && !favoriteIds.has(track.id.value)) {
		return false;
	}

	if (filters.artistIds.length > 0) {
		const trackArtistIds = track.artists.map((a) => a.id);
		const hasMatchingArtist = filters.artistIds.some((id) => trackArtistIds.includes(id));
		if (!hasMatchingArtist) {
			return false;
		}
	}

	if (filters.albumIds.length > 0) {
		if (!track.album || !filters.albumIds.includes(track.album.id)) {
			return false;
		}
	}

	return true;
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
	return filters.favoritesOnly || filters.artistIds.length > 0 || filters.albumIds.length > 0;
}

export function countActiveFilters(filters: LibraryFilters): number {
	let count = 0;
	if (filters.favoritesOnly) count += 1;
	count += filters.artistIds.length;
	count += filters.albumIds.length;
	return count;
}

export function extractUniqueArtists(tracks: readonly Track[]): ArtistReference[] {
	const artistMap = new Map<string, ArtistReference>();

	for (const track of tracks) {
		for (const artist of track.artists) {
			if (!artistMap.has(artist.id)) {
				artistMap.set(artist.id, artist);
			}
		}
	}

	return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function extractUniqueAlbums(tracks: readonly Track[]): AlbumReference[] {
	const albumMap = new Map<string, AlbumReference>();

	for (const track of tracks) {
		if (track.album && !albumMap.has(track.album.id)) {
			albumMap.set(track.album.id, track.album);
		}
	}

	return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
