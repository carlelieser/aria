import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { SearchOptions, SearchResults } from '@plugins/core/interfaces/metadata-provider';
import { ok, type AsyncResult } from '@shared/types/result';
import { useLocalLibraryStore } from '../storage/local-library-store';
import { localTrackToTrack, localAlbumToAlbum, localArtistToArtist } from '../mappers';

/**
 * Paginate items based on search options.
 */
export function paginateResults<T>(items: T[], options?: SearchOptions): SearchResults<T> {
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;
	const paginatedItems = items.slice(offset, offset + limit);

	return {
		items: paginatedItems,
		total: items.length,
		offset,
		limit,
		hasMore: offset + limit < items.length,
	};
}

/**
 * Search for tracks matching the query.
 */
export async function searchTracks(
	query: string,
	options?: SearchOptions
): AsyncResult<SearchResults<Track>, Error> {
	try {
		const state = useLocalLibraryStore.getState();
		const tracks = state.searchTracks(query, options?.limit ?? 50);
		const domainTracks = tracks.map(localTrackToTrack);
		return ok(paginateResults(domainTracks, options));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { success: false, error: new Error(`Search failed: ${message}`) };
	}
}

/**
 * Search for albums matching the query.
 */
export async function searchAlbums(
	query: string,
	options?: SearchOptions
): AsyncResult<SearchResults<Album>, Error> {
	try {
		const searchLower = query.toLowerCase();
		const state = useLocalLibraryStore.getState();
		const matchingAlbums: Album[] = [];

		for (const localAlbum of Object.values(state.albums)) {
			const matches =
				localAlbum.name.toLowerCase().includes(searchLower) ||
				localAlbum.artistName.toLowerCase().includes(searchLower);

			if (matches) {
				matchingAlbums.push(localAlbumToAlbum(localAlbum));
			}
		}

		return ok(paginateResults(matchingAlbums, options));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { success: false, error: new Error(`Search failed: ${message}`) };
	}
}

/**
 * Search for artists matching the query.
 */
export async function searchArtists(
	query: string,
	options?: SearchOptions
): AsyncResult<SearchResults<Artist>, Error> {
	try {
		const searchLower = query.toLowerCase();
		const state = useLocalLibraryStore.getState();
		const matchingArtists: Artist[] = [];

		for (const localArtist of Object.values(state.artists)) {
			if (localArtist.name.toLowerCase().includes(searchLower)) {
				matchingArtists.push(localArtistToArtist(localArtist));
			}
		}

		return ok(paginateResults(matchingArtists, options));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { success: false, error: new Error(`Search failed: ${message}`) };
	}
}
