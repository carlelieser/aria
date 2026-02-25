import type { Track } from '@domain/entities/track';
import type {
	FeedSection,
	FeedItem,
	FeedPlaylist,
	FeedFilterChip,
	HomeFeedData,
} from '@domain/entities/feed-section';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import {
	mapYouTubeTrack,
	mapYouTubeAlbum,
	mapYouTubeArtist,
	mapThumbnailsToArtwork,
} from './mappers';
import type { ClientManager } from './client';
import type { YouTubeMusicItem } from './types';
import { getLogger } from '@shared/services/logger';

import type {
	HomeFeedOperations,
	PlaylistTracksPage,
} from '@plugins/core/interfaces/home-feed-provider';
export type {
	HomeFeedOperations,
	PlaylistTracksPage,
} from '@plugins/core/interfaces/home-feed-provider';

const logger = getLogger('YouTubeMusic:HomeFeed');

interface Continuable {
	readonly has_continuation: boolean;
	readonly contents?: unknown[];
	getContinuation(): Promise<Continuable>;
}

interface TextNode {
	readonly text?: string;
}

interface HomeFeedSectionHeader {
	readonly title?: TextNode;
	readonly strapline?: TextNode;
}

interface HomeFeedSection {
	readonly header?: HomeFeedSectionHeader;
	readonly contents?: unknown[];
}

interface HomeFeedInstance {
	readonly sections?: HomeFeedSection[];
	readonly has_continuation: boolean;
	readonly filters?: string[];
	getContinuation(): Promise<HomeFeedInstance>;
	applyFilter(target: string): Promise<HomeFeedInstance>;
}

function extractTitle(item: YouTubeMusicItem): string | undefined {
	if (typeof item.title === 'string') return item.title;
	if (item.title && typeof item.title === 'object' && 'text' in item.title) {
		return (item.title as { text: string }).text;
	}
	return undefined;
}

function extractSubtitle(item: YouTubeMusicItem): string | undefined {
	if (typeof item.subtitle === 'string') return item.subtitle;
	if (item.subtitle && typeof item.subtitle === 'object' && 'text' in item.subtitle) {
		return item.subtitle.text;
	}
	return undefined;
}

function mapPlaylistItem(item: YouTubeMusicItem): FeedPlaylist | null {
	const browseId = item.browseId ?? item.endpoint?.payload?.browseId;
	if (!browseId) return null;

	const name = extractTitle(item);
	if (!name) return null;

	const artwork = mapThumbnailsToArtwork(item.thumbnails ?? item.thumbnail);

	return {
		id: browseId,
		name,
		artwork: artwork.length > 0 ? artwork : undefined,
		subtitle: extractSubtitle(item),
	};
}

const SUPPORTED_ITEM_TYPES = new Set(['song', 'video', 'album', 'artist', 'playlist', 'endpoint']);

function mapFeedItem(ytItem: Record<string, unknown>): FeedItem | null {
	const itemType = ytItem.item_type as string | undefined;

	// Skip unsupported types (podcasts, episodes, profiles, etc.)
	if (itemType && !SUPPORTED_ITEM_TYPES.has(itemType)) return null;

	if (itemType === 'song' || itemType === 'video') {
		const track = mapYouTubeTrack(ytItem);
		return track ? { type: 'track', data: track } : null;
	}

	if (itemType === 'album') {
		const album = mapYouTubeAlbum(ytItem);
		return album ? { type: 'album', data: album } : null;
	}

	if (itemType === 'artist') {
		const artist = mapYouTubeArtist(ytItem);
		return artist ? { type: 'artist', data: artist } : null;
	}

	if (itemType === 'playlist' || itemType === 'endpoint') {
		const playlist = mapPlaylistItem(ytItem as unknown as YouTubeMusicItem);
		return playlist ? { type: 'playlist', data: playlist } : null;
	}

	// No item_type — skip rather than guess
	return null;
}

function mapSectionItems(contents: unknown[]): FeedItem[] {
	const items: FeedItem[] = [];

	for (const item of contents) {
		if (!item || typeof item !== 'object') continue;

		const feedItem = mapFeedItem(item as Record<string, unknown>);
		if (feedItem) {
			items.push(feedItem);
		}
	}

	return items;
}

function mapHomeFeedSections(feedSections: HomeFeedInstance['sections']): FeedSection[] {
	if (!feedSections) return [];

	const sections: FeedSection[] = [];

	for (const section of feedSections) {
		const title = section.header?.title?.text;
		if (!title || !section.contents) continue;

		const items = mapSectionItems(section.contents);
		if (items.length === 0) continue;

		sections.push({
			id: `remote-${title.toLowerCase().replace(/\s+/g, '-')}-${sections.length}`,
			title,
			subtitle: section.header?.strapline?.text,
			items,
			source: 'remote',
		});
	}

	return sections;
}

const HIDDEN_FILTERS = new Set(['podcasts']);

function extractFilterChips(feed: HomeFeedInstance): FeedFilterChip[] {
	if (!feed.filters) return [];
	return feed.filters
		.filter((text) => !HIDDEN_FILTERS.has(text.toLowerCase()))
		.map((text) => ({ text, isSelected: false }));
}

function mapHomeFeedResponse(feed: HomeFeedInstance): HomeFeedData {
	return {
		sections: mapHomeFeedSections(feed.sections),
		filterChips: extractFilterChips(feed),
		hasContinuation: feed.has_continuation,
	};
}


function mapPlaylistPage(playlistObj: Continuable): PlaylistTracksPage {
	const tracks: Track[] = [];
	if (playlistObj.contents) {
		for (const item of playlistObj.contents as unknown[]) {
			const track = mapYouTubeTrack(item as YouTubeMusicItem);
			if (track) tracks.push(track);
		}
	}
	return { tracks, hasMore: playlistObj.has_continuation };
}

export function createHomeFeedOperations(clientManager: ClientManager): HomeFeedOperations {
	// originalFeed retains the header with filter chips for applyFilter calls.
	// currentFeed tracks the latest response for continuation/section data.
	let originalFeed: HomeFeedInstance | null = null;
	let currentFeed: HomeFeedInstance | null = null;
	let currentPlaylist: Continuable | null = null;

	return {
		async getHomeFeed(): Promise<Result<HomeFeedData, Error>> {
			try {
				const client = await clientManager.getClient();
				const feed = await client.music.getHomeFeed();
				originalFeed = feed as unknown as HomeFeedInstance;
				currentFeed = originalFeed;

				const data = mapHomeFeedResponse(currentFeed);

				logger.info(`Home feed loaded: ${currentFeed.sections?.length ?? 0} sections`);
				return ok(data);
			} catch (error) {
				originalFeed = null;
				currentFeed = null;
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to get home feed: ${String(error)}`)
				);
			}
		},

		async applyFilter(chipText: string): Promise<Result<HomeFeedData, Error>> {
			try {
				// Always apply filters on the original feed which retains the
				// ChipCloud header. Filtered responses omit the header, so
				// calling applyFilter on them throws "Could not find filter".
				if (!originalFeed) {
					return err(new Error('No home feed loaded. Call getHomeFeed() first.'));
				}
				const filtered = await originalFeed.applyFilter(chipText);
				currentFeed = filtered;

				const data = mapHomeFeedResponse(currentFeed);

				logger.info(`Filter applied: "${chipText}"`);
				return ok(data);
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to apply filter: ${String(error)}`)
				);
			}
		},

		async loadMore(): Promise<Result<HomeFeedData, Error>> {
			try {
				if (!currentFeed) {
					return err(new Error('No home feed loaded. Call getHomeFeed() first.'));
				}
				if (!currentFeed.has_continuation) {
					return err(new Error('No more content to load.'));
				}
				const continuation = await currentFeed.getContinuation();
				currentFeed = continuation;

				const data = mapHomeFeedResponse(currentFeed);

				logger.info(`Continuation loaded: ${currentFeed.sections?.length ?? 0} sections`);
				return ok(data);
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to load more: ${String(error)}`)
				);
			}
		},

		async getPlaylistTracks(playlistId: string): Promise<Result<PlaylistTracksPage, Error>> {
			const startMs = Date.now();
			try {
				const client = await clientManager.getClient();
				const playlist = await client.music.getPlaylist(playlistId);
				const playlistObj = playlist as unknown as Continuable;

				currentPlaylist = playlistObj;
				const page = mapPlaylistPage(playlistObj);

				const totalMs = Date.now() - startMs;
				logger.info(
					`Playlist ready: ${page.tracks.length} tracks in ${totalMs}ms (hasMore: ${page.hasMore})`
				);
				return ok(page);
			} catch (error) {
				currentPlaylist = null;
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to fetch playlist tracks: ${String(error)}`)
				);
			}
		},

		async loadMorePlaylistTracks(): Promise<Result<PlaylistTracksPage, Error>> {
			try {
				if (!currentPlaylist || !currentPlaylist.has_continuation) {
					return ok({ tracks: [], hasMore: false });
				}

				const next = await currentPlaylist.getContinuation();
				currentPlaylist = next;
				const page = mapPlaylistPage(next);

				logger.info(
					`Loaded ${page.tracks.length} more playlist tracks (hasMore: ${page.hasMore})`
				);
				return ok(page);
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to load more playlist tracks: ${String(error)}`)
				);
			}
		},
	};
}
