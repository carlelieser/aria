import { useCallback } from 'react';
import type { Track } from '@/src/domain/entities/track';
import { downloadService } from '@/src/application/services/download-service';
import { useDownloadStore } from '@/src/application/state/download-store';
import { useToast } from '@/hooks/use-toast';

interface UseDownloadActionsResult {
	startDownload: (track: Track) => Promise<void>;
	retryDownload: (track: Track) => Promise<void>;
	removeDownload: (trackId: string) => Promise<void>;
	clearFailedDownload: (trackId: string) => void;
	verifyDownload: (trackId: string) => Promise<boolean>;
	isDownloaded: (trackId: string) => boolean;
	isDownloading: (trackId: string) => boolean;
}

export function useDownloadActions(): UseDownloadActionsResult {
	const { success, error } = useToast();

	const clearFailedDownload = useCallback((trackId: string) => {
		useDownloadStore.getState().removeDownload(trackId);
	}, []);

	const startDownload = useCallback(
		async (track: Track) => {
			const result = await downloadService.downloadTrack(track);

			if (!result.success) {
				error('Download failed', result.error.message);
			}
		},
		[error]
	);

	const retryDownload = useCallback(
		async (track: Track) => {
			clearFailedDownload(track.id.value);
			const result = await downloadService.downloadTrack(track);

			if (!result.success) {
				error('Download failed', result.error.message);
			}
		},
		[clearFailedDownload, error]
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
		retryDownload,
		removeDownload,
		clearFailedDownload,
		verifyDownload,
		isDownloaded,
		isDownloading,
	};
}
