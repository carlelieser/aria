import type { Track } from '@/src/domain/entities/track';
import { createTrack } from '@/src/domain/entities/track';
import { TrackId } from '@/src/domain/value-objects/track-id';
import { Duration } from '@/src/domain/value-objects/duration';
import type {
	DownloadInfo,
	DownloadedTrackMetadata,
} from '@/src/domain/value-objects/download-state';

/**
 * Creates a minimal Track from DownloadInfo for display purposes.
 * Duration is set to ZERO since download metadata doesn't store it.
 * The actual track data (including duration) should be fetched from the
 * appropriate source (library, history, or metadata provider).
 */
export function createTrackFromDownloadInfo(info: DownloadInfo): Track {
	const trackId = TrackId.tryFromString(info.trackId) ?? TrackId.create('unknown', info.trackId);

	return createTrack({
		id: trackId,
		title: info.title,
		artists: [{ id: 'unknown', name: info.artistName }],
		duration: Duration.ZERO,
		artwork: info.artworkUrl ? [{ url: info.artworkUrl, width: 48, height: 48 }] : undefined,
		source: {
			type: 'streaming',
			sourcePlugin: trackId.sourceType,
			sourceId: trackId.sourceId,
		},
	});
}

/**
 * Creates a minimal Track from DownloadedTrackMetadata for display purposes.
 * Duration is set to ZERO since download metadata doesn't store it.
 * The actual track data (including duration) should be fetched from the
 * appropriate source (library, history, or metadata provider).
 */
export function createTrackFromDownloadedMetadata(metadata: DownloadedTrackMetadata): Track {
	const trackId =
		TrackId.tryFromString(metadata.trackId) ?? TrackId.create('unknown', metadata.trackId);

	return createTrack({
		id: trackId,
		title: metadata.title,
		artists: [{ id: 'unknown', name: metadata.artistName }],
		duration: Duration.ZERO,
		artwork: metadata.artworkUrl
			? [{ url: metadata.artworkUrl, width: 48, height: 48 }]
			: undefined,
		source: {
			type: 'streaming',
			sourcePlugin: metadata.sourcePlugin || trackId.sourceType,
			sourceId: trackId.sourceId,
		},
	});
}
