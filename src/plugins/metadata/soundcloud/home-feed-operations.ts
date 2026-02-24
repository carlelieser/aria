import type { FeedSection, FeedItem, HomeFeedData } from '@domain/entities/feed-section';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type {
	HomeFeedOperations,
	PlaylistTracksPage,
} from '@plugins/core/interfaces/home-feed-provider';
import type { SoundCloudClient } from './client';
import {
	mapSoundCloudTrack,
	mapSoundCloudTracks,
	mapSoundCloudSimplifiedPlaylist,
} from './mappers';
import type { SoundCloudTrack, SoundCloudPlaylist } from './types';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('SoundCloud:HomeFeed');

function buildTrendingSection(tracks: readonly SoundCloudTrack[]): FeedSection | null {
	const items: FeedItem[] = [];

	for (const track of tracks) {
		const mapped = mapSoundCloudTrack(track);
		if (mapped) {
			items.push({ type: 'track', data: mapped });
		}
	}

	if (items.length === 0) return null;

	return {
		id: 'soundcloud-trending',
		title: 'Trending on SoundCloud',
		items,
		source: 'remote',
	};
}

function buildPlaylistsSection(playlists: readonly SoundCloudPlaylist[]): FeedSection | null {
	const items: FeedItem[] = [];

	for (const playlist of playlists) {
		const mapped = mapSoundCloudSimplifiedPlaylist(playlist);
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
		id: 'soundcloud-your-playlists',
		title: 'Your Playlists',
		items,
		source: 'remote',
	};
}

export function createSoundCloudHomeFeedOperations(client: SoundCloudClient): HomeFeedOperations {
	return {
		async getHomeFeed(): Promise<Result<HomeFeedData, Error>> {
			try {
				const sections: FeedSection[] = [];
				const fetches: Promise<void>[] = [];

				fetches.push(
					client.searchTracks('*', { limit: 20 }).then((result) => {
						if (result.success) {
							const section = buildTrendingSection(result.data.collection);
							if (section) sections.push(section);
						}
					})
				);

				if (client.isAuthenticated()) {
					fetches.push(
						client.getUserPlaylists({ limit: 20 }).then((result) => {
							if (result.success) {
								const section = buildPlaylistsSection(result.data.collection);
								if (section) sections.push(section);
							}
						})
					);
				}

				await Promise.allSettled(fetches);

				logger.info(`SoundCloud home feed loaded: ${sections.length} sections`);

				return ok({
					sections,
					filterChips: [],
					hasContinuation: false,
				});
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to get SoundCloud home feed: ${String(error)}`)
				);
			}
		},

		async applyFilter(): Promise<Result<HomeFeedData, Error>> {
			return ok({ sections: [], filterChips: [], hasContinuation: false });
		},

		async loadMore(): Promise<Result<HomeFeedData, Error>> {
			return ok({ sections: [], filterChips: [], hasContinuation: false });
		},

		async getPlaylistTracks(playlistId: string): Promise<Result<PlaylistTracksPage, Error>> {
			try {
				const result = await client.getPlaylist(playlistId);
				if (!result.success) return result;

				const tracks = mapSoundCloudTracks(result.data.tracks);

				logger.info(
					`Fetched ${tracks.length} tracks from SoundCloud playlist ${playlistId}`
				);
				return ok({ tracks, hasMore: false });
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to fetch SoundCloud playlist tracks: ${String(error)}`)
				);
			}
		},

		async loadMorePlaylistTracks(): Promise<Result<PlaylistTracksPage, Error>> {
			return ok({ tracks: [], hasMore: false });
		},
	};
}
