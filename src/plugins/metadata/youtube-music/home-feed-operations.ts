import type { Track } from '@domain/entities/track';
import { createTrack } from '@domain/entities/track';
import type { AlbumReference } from '@domain/entities/album';
import type { ArtistReference } from '@domain/entities/artist';
import type {
	FeedSection,
	FeedItem,
	FeedPlaylist,
	FeedFilterChip,
	HomeFeedData,
} from '@domain/entities/feed-section';
import { AlbumId } from '@domain/value-objects/album-id';
import { Duration } from '@domain/value-objects/duration';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import {
	mapYouTubeTrack,
	mapYouTubeAlbum,
	mapYouTubeArtist,
	mapThumbnailsToArtwork,
	mapYouTubeArtistReferences,
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

const DURATION_ENRICH_BATCH_SIZE = 10;
const METADATA_ENRICH_BATCH_SIZE = 5;

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

function collectZeroDurationTracks(sections: FeedSection[]): Map<string, Track> {
	const tracks = new Map<string, Track>();
	for (const section of sections) {
		for (const item of section.items) {
			if (item.type === 'track' && item.data.duration.isZero()) {
				tracks.set(item.data.id.sourceId, item.data);
			}
		}
	}
	return tracks;
}

function rebuildTrackWithDuration(track: Track, seconds: number): Track {
	return createTrack({
		id: track.id,
		title: track.title,
		artists: track.artists,
		album: track.album,
		duration: Duration.fromSeconds(seconds),
		artwork: track.artwork,
		source: track.source,
		metadata: track.metadata,
	});
}

function applySectionDurations(
	sections: FeedSection[],
	durationsMap: Map<string, number>
): FeedSection[] {
	return sections.map((section) => ({
		...section,
		items: section.items.map((item): FeedItem => {
			if (item.type !== 'track' || !item.data.duration.isZero()) return item;
			const seconds = durationsMap.get(item.data.id.sourceId);
			if (!seconds) return item;
			return { type: 'track', data: rebuildTrackWithDuration(item.data, seconds) };
		}),
	}));
}

/**
 * Fetches durations for feed tracks that lack them.
 *
 * Home feed carousel items (MusicTwoRowItem) don't include duration in
 * their API response. This function resolves them via getBasicInfo which
 * makes a single lightweight /player call per track.
 */
async function enrichTrackDurations(
	clientManager: ClientManager,
	sections: FeedSection[]
): Promise<FeedSection[]> {
	const zeroDurationTracks = collectZeroDurationTracks(sections);
	if (zeroDurationTracks.size === 0) return sections;

	logger.debug(`Enriching duration for ${zeroDurationTracks.size} feed tracks`);

	const client = await clientManager.getClient();
	const durationsMap = new Map<string, number>();
	const videoIds = Array.from(zeroDurationTracks.keys());

	for (let i = 0; i < videoIds.length; i += DURATION_ENRICH_BATCH_SIZE) {
		const batch = videoIds.slice(i, i + DURATION_ENRICH_BATCH_SIZE);
		const results = await Promise.allSettled(
			batch.map(async (videoId) => {
				const info = await client.getBasicInfo(videoId);
				const seconds = (info as { basic_info?: { duration?: number } }).basic_info
					?.duration;
				if (seconds && seconds > 0) {
					durationsMap.set(videoId, seconds);
				}
			})
		);

		for (let j = 0; j < results.length; j++) {
			if (results[j].status === 'rejected') {
				logger.debug(`Failed to fetch duration for ${batch[j]}`);
			}
		}
	}

	logger.debug(`Resolved ${durationsMap.size}/${zeroDurationTracks.size} track durations`);
	return applySectionDurations(sections, durationsMap);
}

interface UpNextItem {
	type: string;
	video_id?: string;
	thumbnail?: { url: string; width: number; height: number }[];
	album?: { id?: string; name: string; year?: string };
	artists?: { name: string; channel_id?: string }[];
	primary?: UpNextItem | null;
}

function extractPanelVideo(item: UpNextItem): UpNextItem | null {
	if (item.type === 'PlaylistPanelVideo') return item;
	if (item.type === 'PlaylistPanelVideoWrapper') return item.primary ?? null;
	return null;
}

function rebuildTrackWithMetadata(track: Track, panelVideo: UpNextItem): Track {
	const artwork =
		panelVideo.thumbnail && panelVideo.thumbnail.length > 0
			? mapThumbnailsToArtwork(panelVideo.thumbnail)
			: undefined;

	let album: AlbumReference | undefined;
	let year: number | undefined;

	if (panelVideo.album?.name) {
		const albumBrowseId = panelVideo.album.id?.startsWith('MPR')
			? panelVideo.album.id
			: undefined;
		album = {
			id: albumBrowseId
				? AlbumId.create('youtube-music', albumBrowseId).value
				: `youtube-music:${panelVideo.album.name}`,
			name: panelVideo.album.name,
		};

		if (panelVideo.album.year) {
			const parsed = parseInt(panelVideo.album.year, 10);
			if (!isNaN(parsed)) year = parsed;
		}
	}

	const artists: ArtistReference[] | undefined =
		panelVideo.artists && panelVideo.artists.length > 0
			? mapYouTubeArtistReferences(panelVideo.artists)
			: undefined;

	return createTrack({
		id: track.id,
		title: track.title,
		artists: artists ?? track.artists,
		album: album ?? track.album,
		duration: track.duration,
		artwork: artwork && artwork.length > 0 ? artwork : track.artwork,
		source: track.source,
		metadata: year ? { ...track.metadata, year } : track.metadata,
	});
}

/**
 * Enriches video-type playlist tracks with music metadata (album art, album, artists).
 *
 * YouTube Music playlists mix songs (with album art) and videos (with video frame
 * thumbnails). This function fetches the "Up Next" panel for video-type tracks,
 * which contains proper music metadata including album art, album references,
 * and artist data.
 */
async function enrichPlaylistTrackMetadata(
	clientManager: ClientManager,
	tracks: Track[]
): Promise<Track[]> {
	const videoTracks = new Map<string, number[]>();
	for (let i = 0; i < tracks.length; i++) {
		const artworkUrl = tracks[i].artwork?.[0]?.url;
		if (artworkUrl && artworkUrl.includes('i.ytimg.com')) {
			const sourceId = tracks[i].id.sourceId;
			const indices = videoTracks.get(sourceId) ?? [];
			indices.push(i);
			videoTracks.set(sourceId, indices);
		}
	}

	if (videoTracks.size === 0) return tracks;

	logger.debug(`Enriching metadata for ${videoTracks.size} video-type playlist tracks`);

	const client = await clientManager.getClient();
	const enriched = [...tracks];
	const videoIds = Array.from(videoTracks.keys());
	let enrichedCount = 0;

	for (let i = 0; i < videoIds.length; i += METADATA_ENRICH_BATCH_SIZE) {
		const batch = videoIds.slice(i, i + METADATA_ENRICH_BATCH_SIZE);
		const results = await Promise.allSettled(
			batch.map(async (videoId) => {
				const upNext = await client.music.getUpNext(videoId);
				return { videoId, upNext };
			})
		);

		for (let j = 0; j < results.length; j++) {
			const result = results[j];
			if (result.status === 'rejected') {
				logger.debug(`Failed to fetch upNext for ${batch[j]}`);
				continue;
			}

			const { videoId, upNext } = result.value;
			const contents = (upNext as { contents?: UpNextItem[] }).contents;
			if (!contents) continue;

			let panelVideo: UpNextItem | null = null;
			for (const item of contents) {
				const extracted = extractPanelVideo(item);
				if (extracted && extracted.video_id === videoId) {
					panelVideo = extracted;
					break;
				}
			}

			if (!panelVideo) continue;

			const indices = videoTracks.get(videoId);
			if (!indices) continue;

			for (const idx of indices) {
				enriched[idx] = rebuildTrackWithMetadata(enriched[idx], panelVideo);
				enrichedCount++;
			}
		}
	}

	logger.debug(`Enriched ${enrichedCount}/${videoTracks.size} video-type tracks`);
	return enriched;
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
				const enrichedSections = await enrichTrackDurations(clientManager, data.sections);

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
				const enrichedSections = await enrichTrackDurations(clientManager, data.sections);

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
				const enrichedSections = await enrichTrackDurations(clientManager, data.sections);

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
			try {
				const client = await clientManager.getClient();
				const playlist = await client.music.getPlaylist(playlistId);
				const playlistObj = playlist as unknown as Continuable;

				currentPlaylist = playlistObj;
				const page = mapPlaylistPage(playlistObj);
				const enrichedTracks = await enrichPlaylistTrackMetadata(
					clientManager,
					page.tracks
				);

				logger.info(
					`Fetched ${page.tracks.length} tracks from playlist ${playlistId} (hasMore: ${page.hasMore})`
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
				const enrichedTracks = await enrichPlaylistTrackMetadata(
					clientManager,
					page.tracks
				);

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
