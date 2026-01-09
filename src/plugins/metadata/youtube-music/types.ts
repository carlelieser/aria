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
}

export interface YouTubeMusicItem {
	id?: string;
	title?: string;
	artists?: YouTubeArtist[];
	album?: YouTubeAlbum;
	duration?: YouTubeDuration;
	thumbnails?: YouTubeThumbnail[];
	type?: string;

	videoId?: string;

	video_id?: string;

	browseId?: string;

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

export interface YouTubeSearchSuggestion {
	text?: string;
	bold_text?: string;
}
