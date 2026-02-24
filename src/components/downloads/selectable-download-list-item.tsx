/**
 * SelectableDownloadListItem Component
 *
 * Wrapper around DownloadListItem that adds selection mode support.
 * Resolves full track data and shows checkbox overlay when in selection mode.
 */

import { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { TrackListItem } from '@/src/components/media-list/track-list-item';
import { SelectableCheckbox } from '@/src/components/ui/selectable-checkbox';
import type { Track } from '@/src/domain/entities/track';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';
import { createTrackFromDownloadInfo } from '@/src/domain/utils/create-track-from-download';
import { useResolvedTrack } from '@/src/hooks/use-resolved-track';

interface SelectableDownloadListItemProps {
	/** The download info containing track reference and download status */
	readonly downloadInfo: DownloadInfo;
	/** Whether selection mode is active */
	readonly isSelectionMode: boolean;
	/** Whether this item is selected */
	readonly isSelected: boolean;
	/** Callback when item is long pressed (to enter selection mode) */
	readonly onLongPress: (track: Track) => void;
	/** Callback when selection is toggled */
	readonly onSelectionToggle: (track: Track) => void;
	/** Queue of tracks for playback */
	readonly queue?: Track[];
	/** Index of this track in the queue */
	readonly queueIndex?: number;
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

	const fallbackTrack = useMemo(() => createTrackFromDownloadInfo(downloadInfo), [downloadInfo]);
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
			{isSelectionMode && (
				<SelectableCheckbox isSelected={isSelected} onToggle={handleToggle} />
			)}

			<View style={styles.trackItem}>
				<TrackListItem
					track={track}
					source={'library'}
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
