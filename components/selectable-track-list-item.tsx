/**
 * SelectableTrackListItem Component
 *
 * Wrapper around TrackListItem that adds selection mode support.
 * Shows checkbox overlay when in selection mode.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, {
	useAnimatedStyle,
	withTiming,
	FadeIn,
	FadeOut,
} from 'react-native-reanimated';

import { TrackListItem } from '@/components/track-list-item';
import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
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
	const { colors } = useAppTheme();

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

	const checkboxAnimatedStyle = useAnimatedStyle(() => {
		return {
			backgroundColor: withTiming(isSelected ? colors.primary : 'transparent', {
				duration: 150,
			}),
			borderColor: withTiming(isSelected ? colors.primary : colors.outline, {
				duration: 150,
			}),
		};
	}, [isSelected, colors.primary, colors.outline]);

	return (
		<View style={styles.container}>
			{isSelectionMode && (
				<Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
					<Pressable
						style={styles.checkboxContainer}
						onPress={() => onSelectionToggle(track)}
						hitSlop={8}
					>
						<Animated.View style={[styles.checkbox, checkboxAnimatedStyle]}>
							{isSelected && (
								<Icon as={Check} size={14} color={colors.onPrimary} />
							)}
						</Animated.View>
					</Pressable>
				</Animated.View>
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
	checkboxContainer: {
		paddingRight: 8,
		paddingLeft: 4,
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 4,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	trackItem: {
		flex: 1,
	},
});
