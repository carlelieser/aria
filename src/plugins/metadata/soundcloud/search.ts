import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { SearchOptions, SearchResults } from '@plugins/core/interfaces/metadata-provider';
import {
	createSearchResults,
	emptySearchResults,
} from '@plugins/core/interfaces/metadata-provider';
import type { SoundCloudClient } from './client';
import {
	mapSoundCloudTracks,
	mapSoundCloudUsers,
	mapSoundCloudSimplifiedPlaylists,
} from './mappers';

export interface SearchOperations {
	searchTracks(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Track>, Error>>;

	searchArtists(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Artist>, Error>>;

	searchPlaylists(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Playlist>, Error>>;
}

export function createSearchOperations(client: SoundCloudClient): SearchOperations {
	return {
		async searchTracks(
			query: string,
			options?: SearchOptions
		): Promise<Result<SearchResults<Track>, Error>> {
			if (!query.trim()) {
				return ok(emptySearchResults<Track>(options?.offset ?? 0, options?.limit ?? 20));
			}

			const limit = options?.limit ?? 20;
			const offset = options?.offset ?? 0;

			const result = await client.searchTracks(query, { limit, offset });

			if (!result.success) {
				return err(result.error);
			}

			const tracks = mapSoundCloudTracks(result.data.collection);

			return ok(
				createSearchResults(tracks, {
					total: result.data.total_results,
					offset,
					limit,
					hasMore: result.data.next_href !== null,
				})
			);
		},

		async searchArtists(
			query: string,
			options?: SearchOptions
		): Promise<Result<SearchResults<Artist>, Error>> {
			if (!query.trim()) {
				return ok(emptySearchResults<Artist>(options?.offset ?? 0, options?.limit ?? 20));
			}

			const limit = options?.limit ?? 20;
			const offset = options?.offset ?? 0;

			const result = await client.searchUsers(query, { limit, offset });

			if (!result.success) {
				return err(result.error);
			}

			const artists = mapSoundCloudUsers(result.data.collection);

			return ok(
				createSearchResults(artists, {
					total: result.data.total_results,
					offset,
					limit,
					hasMore: result.data.next_href !== null,
				})
			);
		},

		async searchPlaylists(
			query: string,
			options?: SearchOptions
		): Promise<Result<SearchResults<Playlist>, Error>> {
			if (!query.trim()) {
				return ok(emptySearchResults<Playlist>(options?.offset ?? 0, options?.limit ?? 20));
			}

			const limit = options?.limit ?? 20;
			const offset = options?.offset ?? 0;

			const result = await client.searchPlaylists(query, { limit, offset });

			if (!result.success) {
				return err(result.error);
			}

			const playlists = mapSoundCloudSimplifiedPlaylists(result.data.collection);

			return ok(
				createSearchResults(playlists, {
					total: result.data.total_results,
					offset,
					limit,
					hasMore: result.data.next_href !== null,
				})
			);
		},
	};
}
