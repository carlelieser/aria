/**
 * SelectableDownloadListItem Component
 *
 * Wrapper around DownloadListItem that adds selection mode support.
 * Resolves full track data and shows checkbox overlay when in selection mode.
 */

import { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { TrackListItem } from '@/components/track-list-item';
import { SelectableCheckbox } from '@/components/ui/selectable-checkbox';
import type { Track } from '@/src/domain/entities/track';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';
import { createTrackFromDownloadInfo } from '@/src/domain/utils/create-track-from-download';
import { useResolvedTrack } from '@/hooks/use-resolved-track';

interface SelectableDownloadListItemProps {
	/** The download info containing track reference and download status */
	downloadInfo: DownloadInfo;
	/** Whether selection mode is active */
	isSelectionMode: boolean;
	/** Whether this item is selected */
	isSelected: boolean;
	/** Callback when item is long pressed (to enter selection mode) */
	onLongPress: (track: Track) => void;
	/** Callback when selection is toggled */
	onSelectionToggle: (track: Track) => void;
	/** Queue of tracks for playback */
	queue?: Track[];
	/** Index of this track in the queue */
	queueIndex?: number;
}

export const SelectableDownloadListItem = memo(function SelectableDownloadListItem({
	downloadInfo,
	isSelectionMode,
	isSelected,
	onLongPress,
	onSelectionToggle,
	queue,
	queueIndex,
}: SelectableDownloadListItemProps) {
	// Try to resolve full track data from library or history
	const resolvedTrack = useResolvedTrack(downloadInfo.trackId);

	// Create fallback track from download info
	const fallbackTrack = useMemo(() => createTrackFromDownloadInfo(downloadInfo), [downloadInfo]);

	// Use resolved track if available, otherwise use fallback
	const track = resolvedTrack ?? fallbackTrack;

	const handlePress = useCallback(
		(pressedTrack: Track) => {
			if (isSelectionMode) {
				onSelectionToggle(pressedTrack);
			}
		},
		[isSelectionMode, onSelectionToggle]
	);

	const handleLongPress = useCallback(
		(pressedTrack: Track) => {
			onLongPress(pressedTrack);
		},
		[onLongPress]
	);

	const handleToggle = useCallback(() => {
		onSelectionToggle(track);
	}, [onSelectionToggle, track]);

	return (
		<View style={styles.container}>
			{isSelectionMode && <SelectableCheckbox isSelected={isSelected} onToggle={handleToggle} />}

			<View style={styles.trackItem}>
				<TrackListItem
					track={track}
					source="library"
					onPress={isSelectionMode ? handlePress : undefined}
					onLongPress={!isSelectionMode ? handleLongPress : undefined}
					hideOptionsMenu={isSelectionMode}
					queue={queue}
					queueIndex={queueIndex}
				/>
			</View>
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	trackItem: {
		flex: 1,
	},
});
