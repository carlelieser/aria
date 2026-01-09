import { useCallback } from 'react';
import type { Track } from '@/src/domain/entities/track';
import { downloadService } from '@/src/application/services/download-service';
import { useToast } from '@/hooks/use-toast';

interface UseDownloadActionsResult {
	startDownload: (track: Track) => Promise<void>;
	removeDownload: (trackId: string) => Promise<void>;
	verifyDownload: (trackId: string) => Promise<boolean>;
	isDownloaded: (trackId: string) => boolean;
	isDownloading: (trackId: string) => boolean;
}

export function useDownloadActions(): UseDownloadActionsResult {
	const { success, error } = useToast();

	const startDownload = useCallback(
		async (track: Track) => {
			const result = await downloadService.downloadTrack(track);

			if (!result.success) {
				error('Download failed', result.error.message);
			}
		},
		[error]
	);

	const removeDownload = useCallback(
		async (trackId: string) => {
			const result = await downloadService.removeDownload(trackId);

			if (result.success) {
				success('Download removed');
			} else {
				error('Failed to remove download', result.error.message);
			}
		},
		[success, error]
	);

	const verifyDownload = useCallback(async (trackId: string) => {
		return downloadService.verifyDownload(trackId);
	}, []);

	const isDownloaded = useCallback((trackId: string) => {
		return downloadService.isDownloaded(trackId);
	}, []);

	const isDownloading = useCallback((trackId: string) => {
		return downloadService.isDownloading(trackId);
	}, []);

	return {
		startDownload,
		removeDownload,
		verifyDownload,
		isDownloaded,
		isDownloading,
	};
}
