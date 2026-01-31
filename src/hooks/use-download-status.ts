import {
	useIsDownloaded,
	useIsDownloading,
	useDownloadInfo,
} from '@/src/application/state/download-store';
import type { DownloadStatus } from '@/src/domain/value-objects/download-state';

interface UseDownloadStatusResult {
	isDownloaded: boolean;
	isDownloading: boolean;
	progress: number;
	status: DownloadStatus | 'idle';
	error?: string;
}

export function useDownloadStatus(trackId: string): UseDownloadStatusResult {
	const isDownloaded = useIsDownloaded(trackId);
	const isDownloading = useIsDownloading(trackId);
	const downloadInfo = useDownloadInfo(trackId);

	return {
		isDownloaded,
		isDownloading,
		progress: downloadInfo?.progress ?? 0,
		status: downloadInfo?.status ?? 'idle',
		error: downloadInfo?.error,
	};
}
