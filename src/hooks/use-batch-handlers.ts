/**
 * useBatchHandlers Hook
 *
 * Provides common batch action handlers for selection mode across screens.
 * Reduces boilerplate for queue, favorites, library, and playlist operations.
 */

import { useCallback, useState } from 'react';
import { useBatchActions } from '@/src/hooks/use-batch-actions';
import type { Track } from '@/src/domain/entities/track';

interface UseBatchHandlersOptions {
	/** Selected tracks array (pre-computed from selectedTrackIds) */
	selectedTracks: Track[];
	/** Set of selected track IDs */
	selectedTrackIds: Set<string>;
	/** Function to exit selection mode */
	exitSelectionMode: () => void;
}

interface BatchHandlers {
	/** Add selected tracks to queue and exit selection mode */
	handleBatchAddToQueue: () => void;
	/** Toggle favorites for selected tracks and exit selection mode */
	handleBatchToggleFavorites: () => void;
	/** Remove selected tracks from library and exit selection mode */
	handleBatchRemoveFromLibrary: () => void;
	/** Add selected tracks to library and exit selection mode */
	handleBatchAddToLibrary: () => void;
	/** Download selected tracks and exit selection mode */
	handleBatchDownload: () => Promise<void>;
	/** Open playlist picker sheet */
	handleOpenPlaylistPicker: () => void;
	/** Close playlist picker sheet */
	handleClosePlaylistPicker: () => void;
	/** Add selected tracks to a playlist and exit selection mode */
	handleSelectPlaylist: (playlistId: string) => void;
	/** Whether the playlist picker is open */
	isPlaylistPickerOpen: boolean;
	/** Whether a download batch action is processing */
	isDownloading: boolean;
	/** Whether a delete batch action is processing */
	isDeleting: boolean;
}

export function useBatchHandlers({
	selectedTracks,
	selectedTrackIds,
	exitSelectionMode,
}: UseBatchHandlersOptions): BatchHandlers {
	const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);

	const {
		addSelectedToQueue,
		addSelectedToLibrary,
		addSelectedToPlaylist,
		removeSelectedFromLibrary,
		toggleSelectedFavorites,
		downloadSelected,
		isDownloading,
		isDeleting,
	} = useBatchActions();

	const handleBatchAddToQueue = useCallback(() => {
		addSelectedToQueue(selectedTracks);
		exitSelectionMode();
	}, [selectedTracks, addSelectedToQueue, exitSelectionMode]);

	const handleBatchToggleFavorites = useCallback(() => {
		const trackIds = Array.from(selectedTrackIds);
		toggleSelectedFavorites(trackIds);
		exitSelectionMode();
	}, [selectedTrackIds, toggleSelectedFavorites, exitSelectionMode]);

	const handleBatchRemoveFromLibrary = useCallback(() => {
		const trackIds = Array.from(selectedTrackIds);
		removeSelectedFromLibrary(trackIds);
		exitSelectionMode();
	}, [selectedTrackIds, removeSelectedFromLibrary, exitSelectionMode]);

	const handleBatchAddToLibrary = useCallback(() => {
		addSelectedToLibrary(selectedTracks);
		exitSelectionMode();
	}, [selectedTracks, addSelectedToLibrary, exitSelectionMode]);

	const handleBatchDownload = useCallback(async () => {
		await downloadSelected(selectedTracks);
		exitSelectionMode();
	}, [selectedTracks, downloadSelected, exitSelectionMode]);

	const handleOpenPlaylistPicker = useCallback(() => {
		setIsPlaylistPickerOpen(true);
	}, []);

	const handleClosePlaylistPicker = useCallback(() => {
		setIsPlaylistPickerOpen(false);
	}, []);

	const handleSelectPlaylist = useCallback(
		(playlistId: string) => {
			addSelectedToPlaylist(playlistId, selectedTracks);
			setIsPlaylistPickerOpen(false);
			exitSelectionMode();
		},
		[selectedTracks, addSelectedToPlaylist, exitSelectionMode]
	);

	return {
		handleBatchAddToQueue,
		handleBatchToggleFavorites,
		handleBatchRemoveFromLibrary,
		handleBatchAddToLibrary,
		handleBatchDownload,
		handleOpenPlaylistPicker,
		handleClosePlaylistPicker,
		handleSelectPlaylist,
		isPlaylistPickerOpen,
		isDownloading,
		isDeleting,
	};
}
