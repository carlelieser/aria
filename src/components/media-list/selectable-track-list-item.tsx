import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { TrackListItem } from './track-list-item/index';
import { SelectableCheckbox } from '@/src/components/ui/selectable-checkbox';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';

interface SelectableTrackListItemProps {
	readonly track: Track;
	readonly source?: TrackActionSource;
	readonly isSelectionMode: boolean;
	readonly isSelected: boolean;
	readonly onLongPress: (track: Track) => void;
	readonly onSelectionToggle: (track: Track) => void;
	readonly queue?: Track[];
	readonly queueIndex?: number;
	readonly style?: StyleProp<ViewStyle>;
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
	style,
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
		<View style={[styles.container, style]}>
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
