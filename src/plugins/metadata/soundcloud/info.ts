import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { TrackId } from '@domain/value-objects/track-id';
import type { SearchOptions, SearchResults } from '@plugins/core/interfaces/metadata-provider';
import { createSearchResults } from '@plugins/core/interfaces/metadata-provider';
import type { SoundCloudClient } from './client';
import {
	mapSoundCloudTrack,
	mapSoundCloudTracks,
	mapSoundCloudUser,
	mapSoundCloudPlaylist,
} from './mappers';

export interface InfoOperations {
	getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>>;

	getArtistInfo(artistId: string): Promise<Result<Artist, Error>>;

	getArtistTopTracks(
		artistId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Track>, Error>>;

	getPlaylistInfo(playlistId: string): Promise<Result<Playlist, Error>>;
}

export function createInfoOperations(client: SoundCloudClient): InfoOperations {
	return {
		async getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>> {
			if (trackId.sourceType !== 'soundcloud') {
				return err(new Error(`Invalid source type: ${trackId.sourceType}`));
			}

			const result = await client.getTrack(trackId.sourceId);

			if (!result.success) {
				return err(result.error);
			}

			const track = mapSoundCloudTrack(result.data);
			if (!track) {
				return err(new Error('Failed to map track'));
			}

			return ok(track);
		},

		async getArtistInfo(artistId: string): Promise<Result<Artist, Error>> {
			const result = await client.getUser(artistId);

			if (!result.success) {
				return err(result.error);
			}

			const artist = mapSoundCloudUser(result.data);
			if (!artist) {
				return err(new Error('Failed to map user'));
			}

			return ok(artist);
		},

		async getArtistTopTracks(
			artistId: string,
			options?: Pick<SearchOptions, 'limit' | 'offset'>
		): Promise<Result<SearchResults<Track>, Error>> {
			const limit = options?.limit ?? 20;
			const offset = options?.offset ?? 0;

			const result = await client.getUserTracks(artistId, { limit, offset });

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

		async getPlaylistInfo(playlistId: string): Promise<Result<Playlist, Error>> {
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
