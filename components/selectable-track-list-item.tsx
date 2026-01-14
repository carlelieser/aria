/**
 * SelectableTrackListItem Component
 *
 * Wrapper around TrackListItem that adds selection mode support.
 * Shows checkbox overlay when in selection mode.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import { TrackListItem } from '@/components/track-list-item';
import { SelectableCheckbox } from '@/components/ui/selectable-checkbox';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';

interface SelectableTrackListItemProps {
	track: Track;
	source?: TrackActionSource;
	isSelectionMode: boolean;
	isSelected: boolean;
	onLongPress: (track: Track) => void;
	onSelectionToggle: (track: Track) => void;
	/** Queue of tracks for skip next/previous functionality */
	queue?: Track[];
	/** Index of this track in the queue */
	queueIndex?: number;
}

export const SelectableTrackListItem = memo(function SelectableTrackListItem({
	track,
	source = 'search',
	isSelectionMode,
	isSelected,
	onLongPress,
	onSelectionToggle,
	queue,
	queueIndex,
}: SelectableTrackListItemProps) {
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
					source={source}
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
