import { useMemo } from 'react';
import { useDownloadStore } from '@/src/application/state/download-store';
import type { Track } from '@/src/domain/entities/track';

export type DownloadState = 'none' | 'partial' | 'downloading' | 'complete';

export function useCollectionDownloadState(tracks: readonly Track[]): {
	state: DownloadState;
	downloadedCount: number;
	totalCount: number;
} {
	const downloadedTracks = useDownloadStore((s) => s.downloadedTracks);
	const downloads = useDownloadStore((s) => s.downloads);

	return useMemo(() => {
		if (tracks.length === 0) {
			return { state: 'none', downloadedCount: 0, totalCount: 0 };
		}

		let downloadedCount = 0;
		let downloadingCount = 0;

		for (const track of tracks) {
			const trackId = track.id.value;
			if (downloadedTracks.has(trackId)) {
				downloadedCount++;
			} else {
				const info = downloads.get(trackId);
				if (info && (info.status === 'pending' || info.status === 'downloading')) {
					downloadingCount++;
				}
			}
		}

		const totalCount = tracks.length;

		if (downloadingCount > 0) {
			return { state: 'downloading', downloadedCount, totalCount };
		}

		if (downloadedCount === totalCount) {
			return { state: 'complete', downloadedCount, totalCount };
		}

		if (downloadedCount > 0) {
			return { state: 'partial', downloadedCount, totalCount };
		}

		return { state: 'none', downloadedCount, totalCount };
	}, [tracks, downloadedTracks, downloads]);
}
