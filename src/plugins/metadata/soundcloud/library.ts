import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Playlist } from '@domain/entities/playlist';
import type { SearchResults } from '@plugins/core/interfaces/metadata-provider';
import { createSearchResults } from '@plugins/core/interfaces/metadata-provider';
import type { SoundCloudClient } from './client';
import { mapSoundCloudLikedTracks, mapSoundCloudSimplifiedPlaylists } from './mappers';

export interface LibraryOperations {
	getLikedTracks(options?: {
		limit?: number;
		offset?: number;
	}): Promise<Result<SearchResults<Track>, Error>>;

	likeTrack(trackId: string): Promise<Result<void, Error>>;

	unlikeTrack(trackId: string): Promise<Result<void, Error>>;

	getUserPlaylists(options?: {
		limit?: number;
		offset?: number;
	}): Promise<Result<SearchResults<Playlist>, Error>>;

	getPlaylist(playlistId: string): Promise<Result<Playlist, Error>>;
}

export function createLibraryOperations(client: SoundCloudClient): LibraryOperations {
	return {
		async getLikedTracks(options?: {
			limit?: number;
			offset?: number;
		}): Promise<Result<SearchResults<Track>, Error>> {
			const limit = options?.limit ?? 50;
			const offset = options?.offset ?? 0;

			const result = await client.getLikes({ limit, offset });

			if (!result.success) {
				return err(result.error);
			}

			const tracks = mapSoundCloudLikedTracks(result.data.collection);

			return ok(
				createSearchResults(tracks, {
					total: tracks.length,
					offset,
					limit,
					hasMore: result.data.next_href !== null,
				})
			);
		},

		async likeTrack(trackId: string): Promise<Result<void, Error>> {
			return client.likeTrack(trackId);
		},

		async unlikeTrack(trackId: string): Promise<Result<void, Error>> {
			return client.unlikeTrack(trackId);
		},

		async getUserPlaylists(options?: {
			limit?: number;
			offset?: number;
		}): Promise<Result<SearchResults<Playlist>, Error>> {
			const limit = options?.limit ?? 50;
			const offset = options?.offset ?? 0;

			const result = await client.getUserPlaylists({ limit, offset });

			if (!result.success) {
				return err(result.error);
			}

			const playlists = mapSoundCloudSimplifiedPlaylists(result.data.collection);

			return ok(
				createSearchResults(playlists, {
					total: playlists.length,
					offset,
					limit,
					hasMore: result.data.next_href !== null,
				})
			);
		},

		async getPlaylist(playlistId: string): Promise<Result<Playlist, Error>> {
			const { mapSoundCloudPlaylist } = await import('./mappers');

			const result = await client.getPlaylist(playlistId);

			if (!result.success) {
				return err(result.error);
			}

			const playlist = mapSoundCloudPlaylist(result.data);
			if (!playlist) {
				return err(new Error('Failed to map playlist'));
			}

			return ok(playlist);
		},
	};
}
