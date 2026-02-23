import { useState, useCallback } from 'react';
import type { Track } from '@/src/domain/entities/track';
import { downloadService } from '@/src/application/services/download-service';
import { useLibraryStore } from '@/src/application/state/library-store';
import { usePlayerStore } from '@/src/application/state/player-store';
import { useToast } from '@/src/hooks/use-toast';

interface UseBatchActionsResult {
	downloadSelected: (tracks: Track[]) => Promise<void>;
	cancelDownload: () => void;
	addSelectedToLibrary: (tracks: Track[]) => void;
	addSelectedToQueue: (tracks: Track[]) => void;
	removeSelectedFromLibrary: (trackIds: string[]) => void;
	deleteSelectedDownloads: (trackIds: string[]) => Promise<void>;
	toggleSelectedFavorites: (trackIds: string[]) => void;
	addSelectedToPlaylist: (playlistId: string, tracks: Track[]) => void;
	removeSelectedFromPlaylist: (playlistId: string, positions: number[]) => void;
	isDownloading: boolean;
	isDeleting: boolean;
}

export function useBatchActions(): UseBatchActionsResult {
	const { success, error: showError, info } = useToast();
	const addTracks = useLibraryStore((s) => s.addTracks);
	const removeTracks = useLibraryStore((s) => s.removeTracks);
	const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
	const addTrackToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist);
	const removeTrackFromPlaylist = useLibraryStore((s) => s.removeTrackFromPlaylist);
	const setQueue = usePlayerStore((s) => s.setQueue);
	const currentQueue = usePlayerStore((s) => s.queue);

	const [isDownloading, setIsDownloading] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const cancelDownload = useCallback(() => {
		downloadService.cancelBatchDownload();
	}, []);

	const downloadSelected = useCallback(
		async (tracks: Track[]) => {
			if (tracks.length === 0) return;

			setIsDownloading(true);
			const result = await downloadService.downloadTracks(tracks);
			setIsDownloading(false);

			if (result.cancelled) {
				info(`Download cancelled. ${result.completed} tracks completed.`);
			} else if (result.failed === 0 && result.completed > 0) {
				success(`Downloaded ${result.completed} tracks`);
			} else if (result.completed > 0) {
				info(`Downloaded ${result.completed} tracks, ${result.failed} failed`);
			} else if (result.failed > 0) {
				showError('Download failed', `All ${result.failed} downloads failed`);
			} else {
				info('All tracks are already downloaded');
			}
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

	const removeSelectedFromLibrary = useCallback(
		(trackIds: string[]) => {
			if (trackIds.length === 0) return;

			removeTracks(trackIds);
			success(`Removed ${trackIds.length} tracks from library`);
		},
		[removeTracks, success]
	);

	const deleteSelectedDownloads = useCallback(
		async (trackIds: string[]) => {
			if (trackIds.length === 0) return;

			setIsDeleting(true);
			let deleted = 0;
			let failed = 0;

			for (const trackId of trackIds) {
				const result = await downloadService.removeDownload(trackId);
				if (result.success) {
					deleted++;
				} else {
					failed++;
				}
			}

			setIsDeleting(false);

			if (failed === 0) {
				success(`Deleted ${deleted} downloads`);
			} else if (deleted > 0) {
				info(`Deleted ${deleted} downloads, ${failed} failed`);
			} else {
				showError('Delete failed', `Failed to delete ${failed} downloads`);
			}
		},
		[success, showError, info]
	);

	const toggleSelectedFavorites = useCallback(
		(trackIds: string[]) => {
			if (trackIds.length === 0) return;

			for (const trackId of trackIds) {
				toggleFavorite(trackId);
			}
			success(`Updated favorites for ${trackIds.length} tracks`);
		},
		[toggleFavorite, success]
	);

	const addSelectedToPlaylist = useCallback(
		(playlistId: string, tracks: Track[]) => {
			if (tracks.length === 0) return;

			for (const track of tracks) {
				addTrackToPlaylist(playlistId, track);
			}
			success(`Added ${tracks.length} tracks to playlist`);
		},
		[addTrackToPlaylist, success]
	);

	const removeSelectedFromPlaylist = useCallback(
		(playlistId: string, positions: number[]) => {
			if (positions.length === 0) return;

			const sortedPositions = [...positions].sort((a, b) => b - a);
			for (const position of sortedPositions) {
				removeTrackFromPlaylist(playlistId, position);
			}
			success(`Removed ${positions.length} tracks from playlist`);
		},
		[removeTrackFromPlaylist, success]
	);

	return {
		downloadSelected,
		cancelDownload,
		addSelectedToLibrary,
		addSelectedToQueue,
		removeSelectedFromLibrary,
		deleteSelectedDownloads,
		toggleSelectedFavorites,
		addSelectedToPlaylist,
		removeSelectedFromPlaylist,
		isDownloading,
		isDeleting,
	};
}
