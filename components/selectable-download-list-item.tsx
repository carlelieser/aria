/**
 * SelectableDownloadListItem Component
 *
 * Wrapper around DownloadListItem that adds selection mode support.
 * Resolves full track data and shows checkbox overlay when in selection mode.
 */

import { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withTiming, FadeIn, FadeOut } from 'react-native-reanimated';

import { TrackListItem } from '@/components/track-list-item';
import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
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
	const { colors } = useAppTheme();

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

	const primaryColor = colors.primary;
	const outlineColor = colors.outline;

	const checkboxAnimatedStyle = useAnimatedStyle(() => {
		return {
			backgroundColor: withTiming(isSelected ? primaryColor : 'transparent', {
				duration: 150,
			}),
			borderColor: withTiming(isSelected ? primaryColor : outlineColor, {
				duration: 150,
			}),
		};
	}, [isSelected, primaryColor, outlineColor]);

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
							{isSelected && <Icon as={Check} size={14} color={colors.onPrimary} />}
						</Animated.View>
					</Pressable>
				</Animated.View>
			)}

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
