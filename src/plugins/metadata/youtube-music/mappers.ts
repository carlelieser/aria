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

export function mapYouTubeDuration(duration?: YouTubeDuration): Duration {
	if (!duration) {
		return Duration.ZERO;
	}

	if (duration.seconds !== undefined && duration.seconds > 0) {
		return Duration.fromSeconds(duration.seconds);
	}

	if (duration.text) {
		const parsed = Duration.tryParse(duration.text);
		if (parsed) {
			return parsed;
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
	fallbackArtists?: YouTubeArtist[]
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
	const duration = mapYouTubeDuration(item.duration);
	// Use track artists if available, otherwise fall back to album/provided artists
	const trackArtists = item.artists && item.artists.length > 0 ? item.artists : fallbackArtists;
	const artists = mapYouTubeArtistReferences(trackArtists);
	const artwork = mapThumbnailsToArtwork(item.thumbnails);

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

export function mapYouTubeAlbum(item: YouTubeMusicItem): Album | null {
	const browseId = item.browseId || item.endpoint?.payload?.browseId || item.id;
	if (!browseId) {
		return null;
	}

	const name = extractTitle(item);
	if (!name) {
		return null;
	}

	const artists = mapYouTubeArtistReferences(item.artists);
	const artwork = mapThumbnailsToArtwork(item.thumbnails);

	return {
		id: browseId,
		name,
		artists,
		artwork: artwork.length > 0 ? artwork : undefined,
		releaseDate: item.album?.year,
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
