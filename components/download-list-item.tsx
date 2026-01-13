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
import { TrackListItem } from '@/components/track-list-item';
import { createTrackFromDownloadInfo } from '@/src/domain/utils/create-track-from-download';
import { useResolvedTrack } from '@/hooks/use-resolved-track';

interface DownloadListItemProps {
	/** The download info containing track reference and download status */
	downloadInfo: DownloadInfo;
	/** Callback for retrying failed downloads */
	onRetry?: (track: Track) => void;
}

export const DownloadListItem = memo(function DownloadListItem({
	downloadInfo,
	onRetry,
}: DownloadListItemProps) {
	// Try to resolve full track data from library or history
	const resolvedTrack = useResolvedTrack(downloadInfo.trackId);

	// Create fallback track from download info
	const fallbackTrack = useMemo(
		() => createTrackFromDownloadInfo(downloadInfo),
		[downloadInfo]
	);

	// Use resolved track if available, otherwise use fallback
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
