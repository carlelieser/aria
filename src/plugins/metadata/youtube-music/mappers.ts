import type { Track, CreateTrackParams } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist, ArtistReference } from '@domain/entities/artist';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createArtwork, type Artwork } from '@domain/value-objects/artwork';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import { createTrack } from '@domain/entities/track';
import type { YouTubeMusicItem, YouTubeThumbnail, YouTubeDuration, YouTubeArtist } from './types';

function upgradeThumbailUrl(url: string, targetSize: number = 544): string {
	if (url.includes('lh3.googleusercontent.com') || url.includes('yt3.googleusercontent.com')) {
		const baseUrl = url.replace(/=w\d+-h\d+.*$/, '').replace(/=s\d+.*$/, '');
		return `${baseUrl}=w${targetSize}-h${targetSize}-l90-rj`;
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
	if (!thumbnails || thumbnails.length === 0) {
		return [];
	}

	const sortedThumbnails = [...thumbnails]
		.filter((t) => t.url && t.width && t.height)
		.sort((a, b) => b.width * b.height - a.width * a.height);

	if (sortedThumbnails.length === 0) {
		return [];
	}

	const result: Artwork[] = [];
	const largestThumb = sortedThumbnails[0];
	const highResUrl = upgradeThumbailUrl(largestThumb.url, 544);
	result.push(createArtwork(highResUrl, 544, 544));

	for (const t of sortedThumbnails) {
		result.push(createArtwork(t.url, t.width, t.height));
	}

	return result;
}

export function mapYouTubeDuration(duration?: YouTubeDuration | string | number | unknown): Duration {
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
		return [{ id: 'unknown', name: 'Unknown Artist' }];
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
	const duration = mapYouTubeDuration(
		item.duration ?? item.length ?? item.length_seconds
	);
	// Use track artists if available, otherwise fall back to album/provided artists
	const trackArtists = item.artists && item.artists.length > 0 ? item.artists : fallbackArtists;
	const artists = mapYouTubeArtistReferences(trackArtists);
	// Use track thumbnails if available, otherwise fall back to album thumbnails
	const trackThumbnails = item.thumbnails && item.thumbnails.length > 0 ? item.thumbnails : fallbackThumbnails;
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
		params.album = {
			id: item.album.id || item.album.name,
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

function extractArtistFromSubtitle(item: YouTubeMusicItem): ArtistReference[] {
	// Try subtitle field (common in album search results)
	if (item.subtitle) {
		if (typeof item.subtitle === 'string' && item.subtitle.trim()) {
			// Subtitle often contains "Artist • Year" or just "Artist"
			const parts = item.subtitle.split('•').map((p) => p.trim());
			const artistName = parts[0];
			if (artistName && !artistName.match(/^\d{4}$/)) {
				return [{ id: artistName, name: artistName }];
			}
		}
		if (typeof item.subtitle === 'object') {
			if (item.subtitle.text) {
				const parts = item.subtitle.text.split('•').map((p) => p.trim());
				const artistName = parts[0];
				if (artistName && !artistName.match(/^\d{4}$/)) {
					return [{ id: artistName, name: artistName }];
				}
			}
			if (item.subtitle.runs && item.subtitle.runs.length > 0) {
				const artistName = item.subtitle.runs[0].text;
				if (artistName && !artistName.match(/^\d{4}$/)) {
					return [{ id: artistName, name: artistName }];
				}
			}
		}
	}

	// Try author field
	if (item.author) {
		if (typeof item.author === 'string' && item.author.trim()) {
			return [{ id: item.author, name: item.author }];
		}
		if (typeof item.author === 'object' && item.author.name) {
			return [{ id: item.author.id || item.author.name, name: item.author.name }];
		}
	}

	// Try flex_columns (common in some YouTube Music responses)
	if (item.flex_columns && item.flex_columns.length > 1) {
		const artistColumn = item.flex_columns[1];
		const runs = artistColumn?.title?.runs;
		if (runs && runs.length > 0 && runs[0].text) {
			return [{ id: runs[0].endpoint?.browseId || runs[0].text, name: runs[0].text }];
		}
	}

	return [];
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

	// Try multiple sources for artist info
	let artists = mapYouTubeArtistReferences(item.artists);
	if (artists.length === 1 && artists[0].id === 'unknown') {
		const subtitleArtists = extractArtistFromSubtitle(item);
		if (subtitleArtists.length > 0) {
			artists = subtitleArtists;
		}
	}

	const artwork = mapThumbnailsToArtwork(item.thumbnails);

	// Try to extract year from subtitle if not in album
	let releaseDate = item.album?.year;
	if (!releaseDate && item.subtitle) {
		const subtitleText =
			typeof item.subtitle === 'string' ? item.subtitle : item.subtitle.text || '';
		const yearMatch = subtitleText.match(/\b(19|20)\d{2}\b/);
		if (yearMatch) {
			releaseDate = yearMatch[0];
		}
	}

	return {
		id: browseId,
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
	return items
		.map((item) => mapYouTubeTrack(item, fallbackArtists))
		.filter((track): track is Track => track !== null);
}

export function mapYouTubeAlbums(items: YouTubeMusicItem[]): Album[] {
	return items.map(mapYouTubeAlbum).filter((album): album is Album => album !== null);
}

export function mapYouTubeArtists(items: YouTubeMusicItem[]): Artist[] {
	return items.map(mapYouTubeArtist).filter((artist): artist is Artist => artist !== null);
}
