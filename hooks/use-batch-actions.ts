/**
 * useBatchActions Hook
 *
 * Hook for executing batch operations on selected tracks.
 */

import { useState, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import type { Track } from '@/src/domain/entities/track';
import { downloadService } from '@/src/application/services/download-service';
import { useLibraryStore } from '@/src/application/state/library-store';
import { usePlayerStore } from '@/src/application/state/player-store';
import { useToast } from '@/hooks/use-toast';

interface BatchProgress {
	completed: number;
	total: number;
	failed: number;
}

interface UseBatchActionsResult {
	downloadSelected: (tracks: Track[]) => Promise<void>;
	addSelectedToLibrary: (tracks: Track[]) => void;
	addSelectedToQueue: (tracks: Track[]) => void;
	isDownloading: boolean;
	downloadProgress: BatchProgress;
}

export function useBatchActions(): UseBatchActionsResult {
	const { success, error: showError, info } = useToast();
	const addTracks = useLibraryStore((s) => s.addTracks);
	const setQueue = usePlayerStore((s) => s.setQueue);
	const currentQueue = usePlayerStore((s) => s.queue);

	const [isDownloading, setIsDownloading] = useState(false);
	const [downloadProgress, setDownloadProgress] = useState<BatchProgress>({
		completed: 0,
		total: 0,
		failed: 0,
	});

	const downloadSelected = useCallback(
		async (tracks: Track[]) => {
			if (tracks.length === 0) return;

			const tracksToDownload = tracks.filter(
				(track) =>
					!downloadService.isDownloaded(track.id.value) &&
					!downloadService.isDownloading(track.id.value)
			);

			if (tracksToDownload.length === 0) {
				info('All selected tracks are already downloaded or downloading');
				return;
			}

			setIsDownloading(true);
			setDownloadProgress({ completed: 0, total: tracksToDownload.length, failed: 0 });

			InteractionManager.runAfterInteractions(async () => {
				let completed = 0;
				let failed = 0;

				const downloadPromises = tracksToDownload.map(async (track) => {
					const result = await downloadService.downloadTrack(track);
					if (result.success) {
						completed++;
					} else {
						failed++;
					}
					setDownloadProgress({
						completed,
						total: tracksToDownload.length,
						failed,
					});
				});

				await Promise.all(downloadPromises);

				setIsDownloading(false);

				if (failed === 0) {
					success(`Downloaded ${completed} tracks`);
				} else if (completed > 0) {
					info(`Downloaded ${completed} tracks, ${failed} failed`);
				} else {
					showError('Download failed', `All ${failed} downloads failed`);
				}
			});
		},
		[success, showError, info]
	);

	const addSelectedToLibrary = useCallback(
		(tracks: Track[]) => {
			if (tracks.length === 0) return;

			addTracks(tracks);
			success(`Added ${tracks.length} tracks to library`);
		},
		[addTracks, success]
	);

	const addSelectedToQueue = useCallback(
		(tracks: Track[]) => {
			if (tracks.length === 0) return;

			const newQueue = [...currentQueue, ...tracks];
			setQueue(newQueue, currentQueue.length > 0 ? 0 : 0);
			success(`Added ${tracks.length} tracks to queue`);
		},
		[currentQueue, setQueue, success]
	);

	return {
		downloadSelected,
		addSelectedToLibrary,
		addSelectedToQueue,
		isDownloading,
		downloadProgress,
	};
}
