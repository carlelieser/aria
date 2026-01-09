/**
 * YouTube Music data mappers
 *
 * Maps YouTube Music API responses to domain entities
 */

import type { Track, CreateTrackParams } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist, ArtistReference } from '@domain/entities/artist';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createArtwork, type Artwork } from '@domain/value-objects/artwork';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import { createTrack } from '@domain/entities/track';
import type {
  YouTubeMusicItem,
  YouTubeThumbnail,
  YouTubeDuration,
  YouTubeArtist,
} from './types';

/**
 * Upgrade YouTube thumbnail URL to higher resolution
 * YouTube/Google image URLs can have size parameters modified
 */
function upgradeThumbailUrl(url: string, targetSize: number = 544): string {
  // Handle lh3.googleusercontent.com URLs (YouTube Music artwork)
  // Format: =w60-h60-l90-rj or =s60-... etc
  if (url.includes('lh3.googleusercontent.com') || url.includes('yt3.googleusercontent.com')) {
    // Remove existing size params and add new ones
    const baseUrl = url.replace(/=w\d+-h\d+.*$/, '').replace(/=s\d+.*$/, '');
    return `${baseUrl}=w${targetSize}-h${targetSize}-l90-rj`;
  }

  // Handle i.ytimg.com URLs (YouTube video thumbnails)
  // Format: /vi/VIDEO_ID/mqdefault.jpg -> /vi/VIDEO_ID/maxresdefault.jpg
  if (url.includes('i.ytimg.com') || url.includes('img.youtube.com')) {
    return url
      .replace(/\/default\.jpg$/, '/maxresdefault.jpg')
      .replace(/\/mqdefault\.jpg$/, '/maxresdefault.jpg')
      .replace(/\/hqdefault\.jpg$/, '/maxresdefault.jpg')
      .replace(/\/sddefault\.jpg$/, '/maxresdefault.jpg');
  }

  return url;
}

/**
 * Map YouTube thumbnails to Artwork array
 */
export function mapThumbnailsToArtwork(thumbnails?: YouTubeThumbnail[]): Artwork[] {
  if (!thumbnails || thumbnails.length === 0) {
    return [];
  }

  // Get the largest available thumbnail as base
  const sortedThumbnails = [...thumbnails]
    .filter((t) => t.url && t.width && t.height)
    .sort((a, b) => (b.width * b.height) - (a.width * a.height));

  if (sortedThumbnails.length === 0) {
    return [];
  }

  // Create artwork array with upgraded high-res version first
  const result: Artwork[] = [];

  // Add a high-res version (544px or 1200px for player view)
  const largestThumb = sortedThumbnails[0];
  const highResUrl = upgradeThumbailUrl(largestThumb.url, 544);
  result.push(createArtwork(highResUrl, 544, 544));

  // Also add original thumbnails for smaller uses
  for (const t of sortedThumbnails) {
    result.push(createArtwork(t.url, t.width, t.height));
  }

  return result;
}

/**
 * Parse YouTube duration to Duration value object
 */
export function mapYouTubeDuration(duration?: YouTubeDuration): Duration {
  if (!duration) {
    return Duration.ZERO;
  }

  // Prefer seconds if available
  if (duration.seconds !== undefined && duration.seconds > 0) {
    return Duration.fromSeconds(duration.seconds);
  }

  // Try to parse text format (e.g., "3:45", "1:23:45")
  if (duration.text) {
    const parsed = Duration.tryParse(duration.text);
    if (parsed) {
      return parsed;
    }
  }

  return Duration.ZERO;
}

/**
 * Map YouTube artists to ArtistReference array
 */
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

/**
 * Extract video ID from YouTube Music item
 */
function extractVideoId(item: YouTubeMusicItem): string | null {
  // Try different properties where video ID might be
  // Note: youtubei.js uses 'id' for video ID in search results
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

/**
 * Extract title string from YouTube Music item
 * Handles both string and Text object formats
 */
function extractTitle(item: YouTubeMusicItem): string | null {
  if (!item.title) {
    return null;
  }

  // Handle Text object with .text property
  if (typeof item.title === 'object' && 'text' in item.title) {
    return (item.title as any).text;
  }

  // Handle direct string
  if (typeof item.title === 'string') {
    return item.title;
  }

  return null;
}

/**
 * Map YouTube Music item to Track entity
 *
 * @param item - YouTube Music item from search or feed
 * @returns Track entity or null if mapping fails
 */
export function mapYouTubeTrack(item: YouTubeMusicItem): Track | null {
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
  const artists = mapYouTubeArtistReferences(item.artists);
  const artwork = mapThumbnailsToArtwork(item.thumbnails);

  const params: CreateTrackParams = {
    id: trackId,
    title,
    artists,
    duration,
    artwork: artwork.length > 0 ? artwork : undefined,
    source: createStreamingSource('youtube-music', videoId),
    metadata: {
      // Add any available metadata
    },
  };

  // Add album if available
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

/**
 * Map YouTube Music item to Album entity
 *
 * @param item - YouTube Music item representing an album
 * @returns Album entity or null if mapping fails
 */
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

/**
 * Map YouTube Music item to Artist entity
 *
 * @param item - YouTube Music item representing an artist
 * @returns Artist entity or null if mapping fails
 */
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

/**
 * Map array of YouTube Music items to Tracks, filtering out nulls
 */
export function mapYouTubeTracks(items: YouTubeMusicItem[]): Track[] {
  return items.map(mapYouTubeTrack).filter((track): track is Track => track !== null);
}

/**
 * Map array of YouTube Music items to Albums, filtering out nulls
 */
export function mapYouTubeAlbums(items: YouTubeMusicItem[]): Album[] {
  return items.map(mapYouTubeAlbum).filter((album): album is Album => album !== null);
}

/**
 * Map array of YouTube Music items to Artists, filtering out nulls
 */
export function mapYouTubeArtists(items: YouTubeMusicItem[]): Artist[] {
  return items.map(mapYouTubeArtist).filter((artist): artist is Artist => artist !== null);
}
