/**
 * TrackListItem Types
 *
 * Shared types for the TrackListItem component family.
 */

import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';

export interface TrackListItemProps {
	readonly track: Track;
	readonly source?: TrackActionSource;
	readonly onPress?: (track: Track) => void;
	readonly onLongPress?: (track: Track) => void;
	/** When provided, shows download-specific UI (progress, status, actions) */
	readonly downloadInfo?: DownloadInfo;
	/** Hide the options menu (useful in download context) */
	readonly hideOptionsMenu?: boolean;
	/** Fallback artwork URL when track has no artwork (e.g., album artwork) */
	readonly fallbackArtworkUrl?: string;
	/** Queue of tracks for skip next/previous functionality */
	readonly queue?: Track[];
	/** Index of this track in the queue */
	readonly queueIndex?: number;
	/** Playlist ID when displaying tracks from a playlist */
	readonly playlistId?: string;
	/** Track position within the playlist */
	readonly trackPosition?: number;
	/** Callback for retrying failed downloads */
	readonly onRetry?: (track: Track) => void;
}
