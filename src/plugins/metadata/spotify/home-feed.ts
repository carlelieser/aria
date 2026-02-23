import type { FeedSection, FeedItem, HomeFeedData } from '@domain/entities/feed-section';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type {
	HomeFeedOperations,
	PlaylistTracksPage,
} from '@plugins/core/interfaces/home-feed-provider';
import type { SpotifyClient } from './client';
import type { SpotifySimplifiedAlbum, SpotifySimplifiedPlaylist } from './types';
import {
	mapSpotifySimplifiedAlbum,
	mapSpotifySimplifiedPlaylist,
	mapSpotifyTrack,
} from './mappers';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('Spotify:HomeFeed');

function buildNewReleasesSection(albums: SpotifySimplifiedAlbum[]): FeedSection | null {
	const items: FeedItem[] = [];

	for (const album of albums) {
		const mapped = mapSpotifySimplifiedAlbum(album);
		if (mapped) {
			items.push({ type: 'album', data: mapped });
		}
	}

	if (items.length === 0) return null;

	return {
		id: 'spotify-new-releases',
		title: 'New Releases',
		items,
		source: 'remote',
	};
}

function buildPlaylistsSection(playlists: SpotifySimplifiedPlaylist[]): FeedSection | null {
	const items: FeedItem[] = [];

	for (const playlist of playlists) {
		const mapped = mapSpotifySimplifiedPlaylist(playlist);
		if (!mapped) continue;

		items.push({
			type: 'playlist',
			data: {
				id: mapped.id,
				name: mapped.name,
				artwork: mapped.artwork,
				subtitle: mapped.description,
			},
		});
	}

	if (items.length === 0) return null;

	return {
		id: 'spotify-your-playlists',
		title: 'Your Playlists',
		items,
		source: 'remote',
	};
}

export function createSpotifyHomeFeedOperations(client: SpotifyClient): HomeFeedOperations {
	return {
		async getHomeFeed(): Promise<Result<HomeFeedData, Error>> {
			try {
				const sections: FeedSection[] = [];

				const fetches: Promise<void>[] = [];

				fetches.push(
					client.getNewReleases({ limit: 20 }).then((result) => {
						if (result.success) {
							const section = buildNewReleasesSection(result.data.albums.items);
							if (section) sections.push(section);
						}
					})
				);

				if (client.isAuthenticated()) {
					fetches.push(
						client.getUserPlaylists({ limit: 20 }).then((result) => {
							if (result.success) {
								const section = buildPlaylistsSection(result.data.items);
								if (section) sections.push(section);
							}
						})
					);
				}

				await Promise.allSettled(fetches);

				logger.info(`Spotify home feed loaded: ${sections.length} sections`);

				return ok({
					sections,
					filterChips: [],
					hasContinuation: false,
				});
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to get Spotify home feed: ${String(error)}`)
				);
			}
		},

		async applyFilter(): Promise<Result<HomeFeedData, Error>> {
			// Spotify has no filter concept — return empty result
			return ok({ sections: [], filterChips: [], hasContinuation: false });
		},

		async loadMore(): Promise<Result<HomeFeedData, Error>> {
			return ok({ sections: [], filterChips: [], hasContinuation: false });
		},

		async getPlaylistTracks(playlistId: string): Promise<Result<PlaylistTracksPage, Error>> {
			try {
				const result = await client.getPlaylistTracks(playlistId, { limit: 50 });
				if (!result.success) return result;

				const tracks = [];
				for (const item of result.data.items) {
					if (!item.track) continue;
					const track = mapSpotifyTrack(item.track);
					if (track) tracks.push(track);
				}

				logger.info(`Fetched ${tracks.length} tracks from Spotify playlist ${playlistId}`);
				return ok({ tracks, hasMore: false });
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to fetch Spotify playlist tracks: ${String(error)}`)
				);
			}
		},

		async loadMorePlaylistTracks(): Promise<Result<PlaylistTracksPage, Error>> {
			return ok({ tracks: [], hasMore: false });
		},
	};
}
