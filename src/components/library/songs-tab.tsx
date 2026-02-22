import { useState, useCallback, useMemo } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SongList } from './song-list';
import { BatchActionBar } from '@/src/components/selection/batch-action-bar';
import { BatchPlaylistPicker } from '@/src/components/playlist/batch-playlist-picker';
import { useSelection } from '@/src/hooks/use-selection';
import { useBatchActions } from '@/src/hooks/use-batch-actions';
import type { Track } from '@/src/domain/entities/track';

interface SongsTabProps {
	readonly tracks: Track[];
	readonly isLoading: boolean;
	readonly hasFilters: boolean;
	readonly onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function SongsTab({ tracks, isLoading, hasFilters, onScroll }: SongsTabProps) {
	const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);

	const {
		isSelectionMode,
		selectedTrackIds,
		selectedCount,
		enterSelectionMode,
		exitSelectionMode,
		toggleTrackSelection,
	} = useSelection();

	const {
		addSelectedToQueue,
		addSelectedToPlaylist,
		removeSelectedFromLibrary,
		toggleSelectedFavorites,
		isDeleting,
	} = useBatchActions();

	const selectedTracks = useMemo(
		() => tracks.filter((t) => selectedTrackIds.has(t.id.value)),
		[tracks, selectedTrackIds]
	);

	const handleLongPress = useCallback(
		(track: Track) => {
			enterSelectionMode(track.id.value);
		},
		[enterSelectionMode]
	);

	const handleSelectionToggle = useCallback(
		(track: Track) => {
			toggleTrackSelection(track.id.value);
		},
		[toggleTrackSelection]
	);

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

	return (
		<>
			<SongList
				tracks={tracks}
				isLoading={isLoading}
				hasFilters={hasFilters}
				isSelectionMode={isSelectionMode}
				selectedTrackIds={selectedTrackIds}
				onLongPress={handleLongPress}
				onSelectionToggle={handleSelectionToggle}
				onScroll={onScroll}
			/>

			<BatchActionBar
				context={'library'}
				selectedCount={selectedCount}
				onCancel={exitSelectionMode}
				onAddToQueue={handleBatchAddToQueue}
				onAddToPlaylist={handleOpenPlaylistPicker}
				onToggleFavorites={handleBatchToggleFavorites}
				onRemoveFromLibrary={handleBatchRemoveFromLibrary}
				isProcessing={isDeleting}
			/>

			<BatchPlaylistPicker
				isOpen={isPlaylistPickerOpen}
				onClose={handleClosePlaylistPicker}
				onSelectPlaylist={handleSelectPlaylist}
				selectedCount={selectedCount}
			/>
		</>
	);
}
