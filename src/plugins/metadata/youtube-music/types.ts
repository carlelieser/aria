export interface YouTubeThumbnail {
	url: string;
	width: number;
	height: number;
}

export interface YouTubeArtist {
	id?: string;
	name: string;
	channel_id?: string;
	thumbnails?: YouTubeThumbnail[];
}

export interface YouTubeAlbum {
	id?: string;
	name: string;
	year?: string;
}

export interface YouTubeDuration {
	seconds?: number;
	text?: string;
	/** Some API responses use length_seconds */
	length_seconds?: number;
}

export interface YouTubeMusicItem {
	id?: string;
	title?: string;
	artists?: YouTubeArtist[];
	album?: YouTubeAlbum;
	duration?: YouTubeDuration | string | number;
	thumbnails?: YouTubeThumbnail[];
	type?: string;

	videoId?: string;

	video_id?: string;

	browseId?: string;

	/** Alternative duration field names used by some API responses */
	length?: YouTubeDuration | string | number;
	length_seconds?: number;

	/** Subtitle text containing artist/year info for albums */
	subtitle?: string | { text?: string; runs?: { text?: string }[] };

	/** Author info (alternative to artists) */
	author?: { name?: string; id?: string } | string;

	/** Flex columns containing artist info */
	flex_columns?: {
		title?: { runs?: { text?: string; endpoint?: { browseId?: string } }[] };
	}[];

	endpoint?: {
		payload?: {
			videoId?: string;
			browseId?: string;
		};
	};
}

export type YouTubeSearchFilter = 'songs' | 'videos' | 'albums' | 'artists' | 'playlists';

export interface YouTubeHomeFeedSection {
	title?: string;
	contents?: YouTubeMusicItem[];
}

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
		adaptive_formats?: {
			url?: string;
			itag?: number;
			bitrate?: number;
			mime_type?: string;
			audio_quality?: string;
			audio_sample_rate?: string;
		}[];
		formats?: {
			url?: string;
			itag?: number;
			bitrate?: number;
			mime_type?: string;
		}[];
	};
}

export interface YouTubeSearchSuggestion {
	text?: string;
	bold_text?: string;
}
