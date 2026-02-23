import { useStoreWithEqualityFn } from 'zustand/traditional';
import {
	useDownloadStore,
	useActiveDownloadsList,
	useCompletedDownloadsList,
	useFailedDownloadsList,
	useDownloadStats,
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
	const activeDownloads = useActiveDownloadsList();
	const completedDownloads = useCompletedDownloadsList();
	const failedDownloads = useFailedDownloadsList();
	const stats = useDownloadStats();
	const clearActiveDownloads = useDownloadStore((state) => state.clearActiveDownloads);
	const downloadedTracks = useStoreWithEqualityFn(
		useDownloadStore,
		(state) => Array.from(state.downloadedTracks.values()),
		(a, b) => a.length === b.length
	);

	const downloads = [...activeDownloads, ...completedDownloads, ...failedDownloads];

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
