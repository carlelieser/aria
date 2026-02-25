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

const ENRICH_NUM_BATCHES = 3;

interface Continuable {
	has_continuation: boolean;
	getContinuation(): Promise<Continuable & { contents?: unknown[] }>;
	contents?: unknown[];
}

interface HomeFeedInstance {
	sections?: {
		header?: { title?: { text?: string }; strapline?: { text?: string } };
		contents?: unknown[];
	}[];
	header?: { chips?: { as: (type: unknown) => { text?: string; is_selected?: boolean }[] } };
	has_continuation: boolean;
	getContinuation(): Promise<HomeFeedInstance>;
	applyFilter(target: string): Promise<HomeFeedInstance>;
	filters?: string[];
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

function collectTracksNeedingEnrichment(sections: FeedSection[]): Map<string, Track> {
	const tracks = new Map<string, Track>();
	for (const section of sections) {
		for (const item of section.items) {
			if (item.type === 'track' && needsEnrichment(item.data)) {
				tracks.set(item.data.id.sourceId, item.data);
			}
		}
	}
	return tracks;
}

function normalizeTitle(title: string): string {
	return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isTitleMatch(a: string, b: string): boolean {
	const na = normalizeTitle(a);
	const nb = normalizeTitle(b);
	return na === nb || na.includes(nb) || nb.includes(na);
}

function applyEnrichedTracks(
	sections: FeedSection[],
	enrichedMap: Map<string, Track>
): FeedSection[] {
	return sections.map((section) => ({
		...section,
		items: section.items.map((item): FeedItem => {
			if (item.type !== 'track') return item;
			const enriched = enrichedMap.get(item.data.id.sourceId);
			return enriched ? { type: 'track', data: enriched } : item;
		}),
	}));
}

/**
 * Searches for the song variant of each track using "title artist" queries,
 * takes the top result, and validates it matches the original title before
 * accepting it. Returns a map of sourceId → enriched Track.
 */
async function fetchEnrichedTrackMap(
	clientManager: ClientManager,
	tracksToEnrich: Map<string, Track>
): Promise<Map<string, Track>> {
	const client = await clientManager.getClient();
	const enrichedMap = new Map<string, Track>();
	const entries = Array.from(tracksToEnrich.entries());

	async function enrichEntry([videoId, original]: [string, Track]): Promise<void> {
		const artistName = original.artists[0]?.name ?? '';
		const cleanTitle = original.title.replace(/\s*\(official\s+\w+\)/gi, '').trim();
		const query = artistName ? `${cleanTitle} ${artistName}` : cleanTitle;

		const searchResult = await client.music.search(query, { type: 'song' });
		const contents = (searchResult as { contents?: unknown[] }).contents;
		if (!contents) return;

		for (const shelf of contents) {
			const items = (shelf as { contents?: unknown[] })?.contents;
			if (!items) continue;
			for (const item of items) {
				const track = mapYouTubeTrack(item as YouTubeMusicItem);
				if (track && isTitleMatch(track.title, original.title)) {
					enrichedMap.set(videoId, track);
					return;
				}
			}
		}

		logger.debug(`No confident song match for "${original.title}"`);
	}

	const batchSize = Math.ceil(entries.length / ENRICH_NUM_BATCHES);
	for (let i = 0; i < entries.length; i += batchSize) {
		const batch = entries.slice(i, i + batchSize);
		const results = await Promise.allSettled(batch.map(enrichEntry));
		for (let j = 0; j < results.length; j++) {
			if (results[j].status === 'rejected') {
				logger.debug(`Failed to enrich track "${batch[j][1].title}"`);
			}
		}
	}

	return enrichedMap;
}

/**
 * Returns true if the track needs enrichment: either it has a video-frame thumbnail
 * (i.ytimg.com) or it has no duration. Tracks with proper album art and duration
 * are already fully enriched by the API.
 */
function needsEnrichment(track: Track): boolean {
	if (track.duration.isZero()) return true;
	if (!track.artwork || track.artwork.length === 0) return true;
	return track.artwork.some((art) => art.url.includes('i.ytimg.com'));
}

/**
 * Enriches a flat list of tracks that have video thumbnails or zero duration
 * with proper YouTube Music metadata.
 */
async function enrichTrackList(clientManager: ClientManager, tracks: Track[]): Promise<Track[]> {
	const tracksToEnrich = new Map<string, Track>();
	for (const track of tracks) {
		if (needsEnrichment(track)) {
			tracksToEnrich.set(track.id.sourceId, track);
		}
	}

	if (tracksToEnrich.size === 0) return tracks;

	logger.debug(`Enriching ${tracksToEnrich.size} playlist tracks`);
	const enrichedMap = await fetchEnrichedTrackMap(clientManager, tracksToEnrich);
	logger.debug(`Enriched ${enrichedMap.size}/${tracksToEnrich.size} playlist tracks`);

	return tracks.map((track) => enrichedMap.get(track.id.sourceId) ?? track);
}

/**
 * Enriches feed tracks that have zero duration or video thumbnails (i.ytimg.com).
 *
 * Home feed carousel items don't include duration, and video-type tracks have
 * stretched video frame thumbnails instead of real album art. This fetches full
 * YouTube Music track info for those tracks to replace them with proper metadata.
 */
async function enrichTracks(
	clientManager: ClientManager,
	sections: FeedSection[]
): Promise<FeedSection[]> {
	const tracksToEnrich = collectTracksNeedingEnrichment(sections);
	if (tracksToEnrich.size === 0) return sections;

	logger.debug(`Enriching ${tracksToEnrich.size} feed tracks`);
	const enrichedMap = await fetchEnrichedTrackMap(clientManager, tracksToEnrich);
	logger.debug(`Enriched ${enrichedMap.size}/${tracksToEnrich.size} feed tracks`);

	return applyEnrichedTracks(sections, enrichedMap);
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
				const enrichedSections = await enrichTracks(clientManager, data.sections);

				logger.info(`Home feed loaded: ${currentFeed.sections?.length ?? 0} sections`);
				return ok({ ...data, sections: enrichedSections });
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
				const enrichedSections = await enrichTracks(clientManager, data.sections);

				logger.info(`Filter applied: "${chipText}"`);
				return ok({ ...data, sections: enrichedSections });
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
				const enrichedSections = await enrichTracks(clientManager, data.sections);

				logger.info(`Continuation loaded: ${currentFeed.sections?.length ?? 0} sections`);
				return ok({ ...data, sections: enrichedSections });
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
				const enrichedTracks = await enrichTrackList(clientManager, page.tracks);

				const totalMs = Date.now() - startMs;
				logger.info(
					`Playlist ready: ${enrichedTracks.length} tracks in ${totalMs}ms (hasMore: ${page.hasMore})`
				);
				return ok({ tracks: enrichedTracks, hasMore: page.hasMore });
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
				const enrichedTracks = await enrichTrackList(clientManager, page.tracks);

				logger.info(
					`Loaded ${page.tracks.length} more playlist tracks (hasMore: ${page.hasMore})`
				);
				return ok({ tracks: enrichedTracks, hasMore: page.hasMore });
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
