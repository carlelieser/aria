import { useMemo } from 'react';
import {
	useDownloads,
	useDownloadedTracks,
	useDownloadStore,
} from '@/src/application/state/download-store';
import type {
	DownloadInfo,
	DownloadedTrackMetadata,
} from '@/src/domain/value-objects/download-state';

interface DownloadStats {
	activeCount: number;
	completedCount: number;
	failedCount: number;
	pendingCount: number;
	totalSize: number;
}

interface UseDownloadQueueResult {
	downloads: DownloadInfo[];
	downloadedTracks: DownloadedTrackMetadata[];
	activeDownloads: DownloadInfo[];
	completedDownloads: DownloadInfo[];
	failedDownloads: DownloadInfo[];
	stats: DownloadStats;
	hasActiveDownloads: boolean;
	clearActiveDownloads: () => void;
}

export function useDownloadQueue(): UseDownloadQueueResult {
	const downloadsMap = useDownloads();
	const downloadedTracksMap = useDownloadedTracks();
	const clearActiveDownloads = useDownloadStore((state) => state.clearActiveDownloads);

	const downloads = useMemo(() => Array.from(downloadsMap.values()), [downloadsMap]);

	const downloadedTracks = useMemo(
		() => Array.from(downloadedTracksMap.values()),
		[downloadedTracksMap]
	);

	const activeDownloads = useMemo(
		() => downloads.filter((d) => d.status === 'pending' || d.status === 'downloading'),
		[downloads]
	);

	const completedDownloads = useMemo(
		() => downloads.filter((d) => d.status === 'completed'),
		[downloads]
	);

	const failedDownloads = useMemo(
		() => downloads.filter((d) => d.status === 'failed'),
		[downloads]
	);

	const stats = useMemo(() => {
		let activeCount = 0;
		let completedCount = 0;
		let failedCount = 0;
		let pendingCount = 0;
		let totalSize = 0;

		for (const info of downloads) {
			switch (info.status) {
				case 'pending':
					pendingCount++;
					activeCount++;
					break;
				case 'downloading':
					activeCount++;
					break;
				case 'completed':
					completedCount++;
					if (info.fileSize) {
						totalSize += info.fileSize;
					}
					break;
				case 'failed':
					failedCount++;
					break;
			}
		}

		return { activeCount, completedCount, failedCount, pendingCount, totalSize };
	}, [downloads]);

	return {
		downloads,
		downloadedTracks,
		activeDownloads,
		completedDownloads,
		failedDownloads,
		stats,
		hasActiveDownloads: stats.activeCount > 0,
		clearActiveDownloads,
	};
}

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB'];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
