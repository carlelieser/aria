/**
 * DownloadListItem Component
 *
 * Renders a download item by resolving the full track data from available sources
 * (library, history) to display complete metadata including duration.
 * Falls back to download metadata if full track data is not available.
 */

import { memo, useMemo } from 'react';
import type { Track } from '@/src/domain/entities/track';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';
import { TrackListItem } from '@/src/components/media-list/track-list-item';
import { createTrackFromDownloadInfo } from '@/src/domain/utils/create-track-from-download';
import { useResolvedTrack } from '@/src/hooks/use-resolved-track';

interface DownloadListItemProps {
	/** The download info containing track reference and download status */
	readonly downloadInfo: DownloadInfo;
	/** Callback for retrying failed downloads */
	readonly onRetry?: (track: Track) => void;
}

export const DownloadListItem = memo(function DownloadListItem({
	downloadInfo,
	onRetry,
}: DownloadListItemProps) {
	// Try to resolve full track data from library or history
	const resolvedTrack = useResolvedTrack(downloadInfo.trackId);

	const fallbackTrack = useMemo(() => createTrackFromDownloadInfo(downloadInfo), [downloadInfo]);
	const track = resolvedTrack ?? fallbackTrack;

	return (
		<TrackListItem
			track={track}
			downloadInfo={downloadInfo}
			hideOptionsMenu
			onRetry={downloadInfo.status === 'failed' ? onRetry : undefined}
		/>
	);
});
