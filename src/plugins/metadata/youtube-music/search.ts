import type Innertube from 'youtubei.js/react-native';
import type { SearchOptions, SearchResults } from '@plugins/core/interfaces/metadata-provider';
import { createSearchResults } from '@plugins/core/interfaces/metadata-provider';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { mapYouTubeTrack, mapYouTubeAlbum, mapYouTubeArtist } from './mappers';
import type { ClientManager } from './client';
import type { YouTubeMusicItem } from './types';

type SearchType = 'song' | 'album' | 'artist';

function extractFromShelves<T>(
	contents: unknown[] | undefined,
	mapper: (item: unknown) => T | null
): T[] {
	const items: T[] = [];

	if (!contents) return items;

	for (const shelf of contents) {
		const shelfContents = (shelf as { contents?: unknown[] })?.contents;
		if (!shelfContents) continue;

		for (const item of shelfContents) {
			if (!item) continue;
			const mapped = mapper(item);
			if (mapped) items.push(mapped);
		}
	}

	return items;
}

function paginate<T>(items: T[], options?: SearchOptions): SearchResults<T> {
	const limit = options?.limit || items.length;
	const offset = options?.offset || 0;
	const paginatedItems = items.slice(offset, offset + limit);

	return createSearchResults(paginatedItems, {
		total: items.length,
		offset,
		limit,
		hasMore: offset + paginatedItems.length < items.length,
	});
}

export interface SearchOperations {
	searchTracks(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Track>, Error>>;
	searchAlbums(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Album>, Error>>;
	searchArtists(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Artist>, Error>>;
}

export function createSearchOperations(clientManager: ClientManager): SearchOperations {
	async function search<T>(
		query: string,
		type: SearchType,
		mapper: (item: unknown) => T | null,
		options?: SearchOptions,
		errorMessage?: string
	): Promise<Result<SearchResults<T>, Error>> {
		try {
			const client = await clientManager.getClient();
			const searchResults = await client.music.search(query, { type });
			const items = extractFromShelves(searchResults.contents as unknown[], mapper);
			return ok(paginate(items, options));
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(errorMessage || `Search failed: ${String(error)}`)
			);
		}
	}

	return {
		searchTracks(query: string, options?: SearchOptions) {
			return search(
				query,
				'song',
				(item) => mapYouTubeTrack(item as YouTubeMusicItem),
				options,
				'YouTube Music search failed'
			);
		},

		searchAlbums(query: string, options?: SearchOptions) {
			return search(
				query,
				'album',
				(item) => mapYouTubeAlbum(item as YouTubeMusicItem),
				options,
				'YouTube Music album search failed'
			);
		},

		searchArtists(query: string, options?: SearchOptions) {
			return search(
				query,
				'artist',
				(item) => mapYouTubeArtist(item as YouTubeMusicItem),
				options,
				'YouTube Music artist search failed'
			);
		},
	};
}
