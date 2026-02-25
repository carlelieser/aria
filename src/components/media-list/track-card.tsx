/**
 * TrackCard Component
 *
 * Card-style display for tracks in horizontal scrolling lists.
 * Uses M3 theming.
 */

import { memo, useCallback, useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Text } from 'react-native-paper';
import { Music } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/src/components/ui/icon';
import { AudioWaveform } from '@/src/components/ui/audio-waveform';
import { usePlayerActions } from '@/src/hooks/use-player';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import { useTrackPlaybackInfo } from '@/src/application/state/player-store';
import { useOpenTrackOptions } from '@/src/application/state/track-options-store';
import { DownloadIndicator } from './download-indicator';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { usePluginManifest } from '@/src/hooks/use-plugin-registry';
import {
	useOpenPlayerOnTrackClick,
	useShowProviderLabel,
} from '@/src/application/state/settings-store';
import { router } from 'expo-router';

interface TrackCardProps {
	readonly track: Track;
	readonly source?: TrackActionSource;
	readonly onPress?: (track: Track) => void;
	/** Queue of tracks for skip next/previous functionality */
	readonly queue?: Track[];
	/** Index of this track in the queue */
	readonly queueIndex?: number;
}

export const TrackCard = memo(
	function TrackCard({ track, source = 'library', onPress, queue, queueIndex }: TrackCardProps) {
		const { play, playQueue } = usePlayerActions();
		const { colors } = useAppTheme();
		const { isActiveTrack, isCurrentlyPlaying } = useTrackPlaybackInfo(track.id.value);
		const openPlayerOnTrackClick = useOpenPlayerOnTrackClick();
		const showProviderLabel = useShowProviderLabel();
		const openTrackOptions = useOpenTrackOptions();

		const handlePress = useCallback(() => {
			if (onPress) {
				onPress(track);
				return;
			}
			if (queue && queueIndex !== undefined) {
				playQueue(queue, queueIndex);
			} else {
				play(track);
			}
			if (!onPress && openPlayerOnTrackClick) {
				router.push('/player');
			}
		}, [onPress, track, play, playQueue, queue, queueIndex, openPlayerOnTrackClick]);

		const handleLongPress = useCallback(() => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			openTrackOptions(track, source);
		}, [openTrackOptions, track, source]);

		const pluginManifest = usePluginManifest(track.id.sourceType);

		const artworkUrl = useMemo(() => getBestArtwork(track.artwork, 300)?.url, [track.artwork]);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- getArtistNames only reads track.artists
		const artistNames = useMemo(() => getArtistNames(track), [track.artists]);
		const artworkSource = useMemo(
			() => (artworkUrl ? { uri: artworkUrl } : undefined),
			[artworkUrl]
		);

		return (
			<TouchableOpacity
				style={styles.container}
				onPress={handlePress}
				onLongPress={handleLongPress}
				delayLongPress={300}
				activeOpacity={0.7}
			>
				<View style={styles.artworkWrapper}>
					<View
						style={[
							styles.artworkContainer,
							!artworkUrl && { backgroundColor: colors.surfaceContainerHighest },
						]}
					>
						{artworkUrl ? (
							<Image
								source={artworkSource}
								style={styles.artwork}
								contentFit={'cover'}
								transition={200}
								cachePolicy={'memory-disk'}
								recyclingKey={track.id.value}
							/>
						) : (
							<Icon as={Music} size={48} color={colors.onSurfaceVariant} />
						)}
						{isCurrentlyPlaying && <AudioWaveform />}
					</View>
					<DownloadIndicator trackId={track.id.value} size={'lg'} />
				</View>
				<View style={styles.infoContainer}>
					<Text
						variant={'labelLarge'}
						numberOfLines={1}
						style={{ color: isActiveTrack ? colors.primary : colors.onSurface }}
					>
						{track.title}
					</Text>
					<Text
						variant={'bodySmall'}
						numberOfLines={1}
						style={{ color: colors.onSurfaceVariant }}
					>
						{artistNames}
						{showProviderLabel && pluginManifest
							? ` · ${pluginManifest.shortName ?? pluginManifest.name}`
							: ''}
					</Text>
				</View>
			</TouchableOpacity>
		);
	},
	(prevProps, nextProps) =>
		prevProps.track.id.value === nextProps.track.id.value &&
		prevProps.track.title === nextProps.track.title &&
		prevProps.queueIndex === nextProps.queueIndex &&
		prevProps.onPress === nextProps.onPress
);

const styles = StyleSheet.create({
	container: {
		width: 128,
	},
	artworkWrapper: {
		position: 'relative',
	},
	artworkContainer: {
		width: 128,
		height: 128,
		borderRadius: M3Shapes.medium,
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	artwork: {
		width: 128,
		height: 128,
		borderRadius: M3Shapes.medium,
	},
	infoContainer: {
		marginTop: 8,
	},
});
