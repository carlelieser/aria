/**
 * YouTube Music plugin types
 *
 * These types represent data structures from the YouTube Music API
 * as exposed by the youtubei.js library.
 */

/**
 * YouTube thumbnail
 */
export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

/**
 * YouTube music artist
 */
export interface YouTubeArtist {
  id?: string;
  name: string;
  channel_id?: string;
  thumbnails?: YouTubeThumbnail[];
}

/**
 * YouTube music album
 */
export interface YouTubeAlbum {
  id?: string;
  name: string;
  year?: string;
}

/**
 * YouTube duration - can be in different formats
 */
export interface YouTubeDuration {
  seconds?: number;
  text?: string;
}

/**
 * YouTube Music item type from search/home feed
 *
 * This represents items from MusicResponsiveListItem
 * which is the common format for tracks in search results and feeds
 */
export interface YouTubeMusicItem {
  id?: string;
  title?: string;
  artists?: YouTubeArtist[];
  album?: YouTubeAlbum;
  duration?: YouTubeDuration;
  thumbnails?: YouTubeThumbnail[];
  type?: string;
  /** Video ID for streaming */
  videoId?: string;
  /** Alternative video ID property (some youtubei.js responses use snake_case) */
  video_id?: string;
  /** Browse ID for albums/artists */
  browseId?: string;
  /** Endpoint data */
  endpoint?: {
    payload?: {
      videoId?: string;
      browseId?: string;
    };
  };
}

/**
 * YouTube Music search filter type
 */
export type YouTubeSearchFilter = 'songs' | 'videos' | 'albums' | 'artists' | 'playlists';

/**
 * YouTube Music home feed section
 */
export interface YouTubeHomeFeedSection {
  title?: string;
  contents?: any[];
}

/**
 * YouTube video info response
 */
export interface YouTubeVideoInfo {
  basic_info?: {
    id?: string;
    title?: string;
    duration?: number;
    channel?: {
      id?: string;
      name?: string;
    };
    thumbnail?: YouTubeThumbnail[];
  };
  streaming_data?: {
    adaptive_formats?: Array<{
      url?: string;
      itag?: number;
      bitrate?: number;
      mime_type?: string;
      audio_quality?: string;
      audio_sample_rate?: string;
    }>;
    formats?: Array<{
      url?: string;
      itag?: number;
      bitrate?: number;
      mime_type?: string;
    }>;
  };
}

/**
 * YouTube search suggestion
 */
export interface YouTubeSearchSuggestion {
  text?: string;
  bold_text?: string;
}
