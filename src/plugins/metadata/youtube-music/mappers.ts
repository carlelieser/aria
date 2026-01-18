import type { Track, CreateTrackParams } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist, ArtistReference } from '@domain/entities/artist';
import { TrackId } from '@domain/value-objects/track-id';
import { AlbumId } from '@domain/value-objects/album-id';
import { Duration } from '@domain/value-objects/duration';
import type { Artwork } from '@domain/value-objects/artwork';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import { createTrack } from '@domain/entities/track';
import {
	UNKNOWN_ARTIST,
	mapAndFilter,
	mapImagesToArtwork,
	extractYearFromSubtitle,
} from '@shared/mappers';
import type { YouTubeMusicItem, YouTubeThumbnail, YouTubeDuration, YouTubeArtist } from './types';

/**
 * Upgrades YouTube thumbnail URLs to higher resolution versions.
 */
function upgradeYouTubeThumbnailUrl(url: string): string {
	if (url.includes('lh3.googleusercontent.com') || url.includes('yt3.googleusercontent.com')) {
		const baseUrl = url.replace(/=w\d+-h\d+.*$/, '').replace(/=s\d+.*$/, '');
		return `${baseUrl}=w544-h544-l90-rj`;
	}

	if (url.includes('i.ytimg.com') || url.includes('img.youtube.com')) {
		return url
			.replace(/\/default\.jpg$/, '/maxresdefault.jpg')
			.replace(/\/mqdefault\.jpg$/, '/maxresdefault.jpg')
			.replace(/\/hqdefault\.jpg$/, '/maxresdefault.jpg')
			.replace(/\/sddefault\.jpg$/, '/maxresdefault.jpg');
	}

	return url;
}

export function mapThumbnailsToArtwork(thumbnails?: YouTubeThumbnail[]): Artwork[] {
	return mapImagesToArtwork(thumbnails, {
		urlTransformer: upgradeYouTubeThumbnailUrl,
		primarySize: 544,
		sortByResolution: true,
	});
}

export function mapYouTubeDuration(
	duration?: YouTubeDuration | string | number | unknown
): Duration {
	if (!duration) {
		return Duration.ZERO;
	}

	// Handle direct number (seconds)
	if (typeof duration === 'number' && duration > 0) {
		return Duration.fromSeconds(duration);
	}

	// Handle direct string (e.g., "3:45")
	if (typeof duration === 'string') {
		const parsed = Duration.tryParse(duration);
		if (parsed) {
			return parsed;
		}
		return Duration.ZERO;
	}

	// Handle objects (YouTubeDuration or youtubei.js Text objects)
	if (typeof duration === 'object') {
		const durationObj = duration as Record<string, unknown>;

		// Handle object with seconds field (number)
		if (typeof durationObj.seconds === 'number' && durationObj.seconds > 0) {
			return Duration.fromSeconds(durationObj.seconds);
		}

		// Handle object with length_seconds field (alternative API format)
		if (typeof durationObj.length_seconds === 'number' && durationObj.length_seconds > 0) {
			return Duration.fromSeconds(durationObj.length_seconds);
		}

		// Handle object with text field (string)
		if (typeof durationObj.text === 'string' && durationObj.text) {
			const parsed = Duration.tryParse(durationObj.text);
			if (parsed) {
				return parsed;
			}
		}

		// Handle youtubei.js Text objects with toString()
		if (typeof durationObj.toString === 'function') {
			const textValue = durationObj.toString();
			if (textValue && textValue !== '[object Object]') {
				const parsed = Duration.tryParse(textValue);
				if (parsed) {
					return parsed;
				}
			}
		}
	}

	return Duration.ZERO;
}

export function mapYouTubeArtistReferences(artists?: YouTubeArtist[]): ArtistReference[] {
	if (!artists || artists.length === 0) {
		return [UNKNOWN_ARTIST];
	}

	return artists
		.filter((artist) => artist.name)
		.map((artist) => ({
			id: artist.id || artist.channel_id || artist.name,
			name: artist.name,
		}));
}

function extractVideoId(item: YouTubeMusicItem): string | null {
	if (item.id) {
		return item.id;
	}

	if (item.videoId) {
		return item.videoId;
	}

	if (item.video_id) {
		return item.video_id;
	}

	if (item.endpoint?.payload?.videoId) {
		return item.endpoint.payload.videoId;
	}

	return null;
}

function extractTitle(item: YouTubeMusicItem): string | null {
	if (!item.title) {
		return null;
	}

	if (typeof item.title === 'object' && 'text' in item.title) {
		return (item.title as { text: string }).text;
	}

	if (typeof item.title === 'string') {
		return item.title;
	}

	return null;
}

export function mapYouTubeTrack(
	item: YouTubeMusicItem,
	fallbackArtists?: YouTubeArtist[],
	fallbackThumbnails?: YouTubeThumbnail[]
): Track | null {
	const videoId = extractVideoId(item);
	if (!videoId) {
		return null;
	}

	const title = extractTitle(item);
	if (!title) {
		return null;
	}

	const trackId = TrackId.create('youtube-music', videoId);
	// Check multiple possible duration field locations
	const duration = mapYouTubeDuration(item.duration ?? item.length ?? item.length_seconds);
	// Use track artists if available, otherwise fall back to album/provided artists
	const trackArtists = item.artists && item.artists.length > 0 ? item.artists : fallbackArtists;
	const artists = mapYouTubeArtistReferences(trackArtists);
	// Use track thumbnails if available, otherwise fall back to album thumbnails
	const trackThumbnails =
		item.thumbnails && item.thumbnails.length > 0 ? item.thumbnails : fallbackThumbnails;
	const artwork = mapThumbnailsToArtwork(trackThumbnails);

	const params: CreateTrackParams = {
		id: trackId,
		title,
		artists,
		duration,
		artwork: artwork.length > 0 ? artwork : undefined,
		source: createStreamingSource('youtube-music', videoId),
		metadata: {},
	};

	if (item.album?.name) {
		const albumSourceId = item.album.id || item.album.name;
		params.album = {
			id: AlbumId.create('youtube-music', albumSourceId).value,
			name: item.album.name,
		};

		if (item.album.year) {
			const year = parseInt(item.album.year, 10);
			if (!isNaN(year)) {
				params.metadata = {
					...params.metadata,
					year,
				};
			}
		}
	}

	return createTrack(params);
}

/**
 * Extracts artist references from a YouTube Music item using ONLY structured API fields.
 *
 * IMPORTANT: This function intentionally does NOT parse UI text like subtitles.
 * Subtitle text is locale-dependent, fragile, and can contain type labels (e.g., "Album")
 * that are not artist names. If no structured artist data exists, we accept UNKNOWN_ARTIST
 * rather than guessing from display text.
 *
 * Structured sources checked (in order of preference):
 * 1. item.artists - Primary artist array with id/channel_id
 * 2. item.author - Author object with id field
 * 3. item.flex_columns - Only when browseId is present (ensures it's a real entity reference)
 */
function extractArtistsFromItem(item: YouTubeMusicItem): ArtistReference[] {
	// 1. Primary: artists array (most reliable)
	if (item.artists && item.artists.length > 0) {
		const mapped = item.artists
			.filter((artist) => artist.name)
			.map((artist) => ({
				id: artist.id || artist.channel_id || artist.name,
				name: artist.name,
			}));
		if (mapped.length > 0) {
			return mapped;
		}
	}

	// 2. Fallback: author field (structured object with id)
	if (item.author && typeof item.author === 'object' && item.author.name) {
		return [{ id: item.author.id || item.author.name, name: item.author.name }];
	}

	// 3. Fallback: flex_columns ONLY when browseId exists (ensures real entity reference)
	if (item.flex_columns && item.flex_columns.length > 1) {
		const artistColumn = item.flex_columns[1];
		const runs = artistColumn?.title?.runs;
		if (runs && runs.length > 0) {
			const run = runs[0];
			// Only use if we have a browseId - this confirms it's a navigable entity
			if (run.text && run.endpoint?.browseId) {
				return [{ id: run.endpoint.browseId, name: run.text }];
			}
		}
	}

	// No structured data available - accept it gracefully
	return [UNKNOWN_ARTIST];
}

export function mapYouTubeAlbum(item: YouTubeMusicItem): Album | null {
	const browseId = item.browseId || item.endpoint?.payload?.browseId || item.id;
	if (!browseId) {
		return null;
	}

	const name = extractTitle(item);
	if (!name) {
		return null;
	}

	// Extract artists from structured API fields only
	const artists = extractArtistsFromItem(item);

	const artwork = mapThumbnailsToArtwork(item.thumbnails);

	// Try to extract year from album info or subtitle
	const subtitleText =
		typeof item.subtitle === 'string' ? item.subtitle : item.subtitle?.text || '';
	const releaseDate = item.album?.year ?? extractYearFromSubtitle(subtitleText);

	return {
		id: AlbumId.create('youtube-music', browseId),
		name,
		artists,
		artwork: artwork.length > 0 ? artwork : undefined,
		releaseDate,
		albumType: 'album',
	};
}

export function mapYouTubeArtist(item: YouTubeMusicItem): Artist | null {
	const browseId = item.browseId || item.endpoint?.payload?.browseId || item.id;
	if (!browseId) {
		return null;
	}

	const name = extractTitle(item);
	if (!name) {
		return null;
	}

	const artwork = mapThumbnailsToArtwork(item.thumbnails);

	return {
		id: browseId,
		name,
		artwork: artwork.length > 0 ? artwork : undefined,
	};
}

export function mapYouTubeTracks(
	items: YouTubeMusicItem[],
	fallbackArtists?: YouTubeArtist[]
): Track[] {
	return mapAndFilter(items, (item) => mapYouTubeTrack(item, fallbackArtists));
}

export function mapYouTubeAlbums(items: YouTubeMusicItem[]): Album[] {
	return mapAndFilter(items, mapYouTubeAlbum);
}

export function mapYouTubeArtists(items: YouTubeMusicItem[]): Artist[] {
	return mapAndFilter(items, mapYouTubeArtist);
}
