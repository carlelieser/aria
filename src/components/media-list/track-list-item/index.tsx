/**
 * TrackListItem Component
 *
 * Displays a track in a list format with artwork, info, and actions.
 * Uses M3 theming. Reflects live playback state: waveform overlay on artwork,
 * primary-colored title, and live position instead of static duration.
 */

import { memo, useCallback, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Music } from 'lucide-react-native';
import { Text, ProgressBar } from 'react-native-paper';

import { Icon } from '@/src/components/ui/icon';
import { AudioWaveform } from '@/src/components/ui/audio-waveform';
import { usePlayerActions } from '@/src/hooks/use-player';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import { useTrackPlaybackInfo } from '@/src/application/state/player-store';
import { TrackOptionsMenu } from '@/src/components/track-options-menu';
import { DownloadIndicator } from '../download-indicator';
import { useDownloadActions } from '@/src/hooks/use-download-actions';
import { useAppTheme } from '@/lib/theme';
import {
	useOpenPlayerOnTrackClick,
	useShowProviderLabel,
} from '@/src/application/state/settings-store';
import { router } from 'expo-router';
import { usePluginManifest } from '@/src/hooks/use-plugin-registry';
import type { TrackListItemProps } from './types';
import { DownloadStatus } from './download-status';
import { DownloadActions } from './download-actions';
import { styles } from './styles';

export type { TrackListItemProps } from './types';

export const TrackListItem = memo(function TrackListItem({
	track,
	source = 'library',
	onPress,
	onLongPress,
	downloadInfo,
	hideOptionsMenu = false,
	fallbackArtworkUrl,
	queue,
	queueIndex,
	playlistId,
	trackPosition,
	onRetry,
}: TrackListItemProps) {
	const { play, playQueue } = usePlayerActions();
	const { removeDownload } = useDownloadActions();
	const { colors } = useAppTheme();
	const openPlayerOnTrackClick = useOpenPlayerOnTrackClick();
	const showProviderLabel = useShowProviderLabel();
	const { isActiveTrack, isCurrentlyPlaying, formattedPosition } = useTrackPlaybackInfo(
		track.id.value
	);

	const longPressedRef = useRef(false);

	const handlePress = useCallback(() => {
		if (longPressedRef.current) {
			longPressedRef.current = false;
			return;
		}
		if (onPress) {
			onPress(track);
		} else {
			if (queue && queueIndex !== undefined) {
				playQueue(queue, queueIndex);
			} else {
				play(track);
			}
			if (openPlayerOnTrackClick) {
				router.push('/player');
			}
		}
	}, [onPress, track, play, playQueue, queue, queueIndex, openPlayerOnTrackClick]);

	const handleLongPress = useCallback(() => {
		longPressedRef.current = true;
		onLongPress?.(track);
	}, [onLongPress, track]);

	const handleRemoveDownload = useCallback(async () => {
		if (downloadInfo) {
			await removeDownload(downloadInfo.trackId);
		}
	}, [removeDownload, downloadInfo]);

	const pluginManifest = usePluginManifest(track.id.sourceType);

	const artwork = getBestArtwork(track.artwork, 300);
	const artworkUrl = artwork?.url ?? fallbackArtworkUrl;
	const artistNames = getArtistNames(track);
	const albumName = track.album?.name;
	const duration = track.duration.format();
	const displayTime = formattedPosition ?? duration;

	const isDownloading =
		downloadInfo?.status === 'pending' || downloadInfo?.status === 'downloading';

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={handlePress}
			onLongPress={onLongPress ? handleLongPress : undefined}
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
							source={{ uri: artworkUrl }}
							style={styles.artwork}
							contentFit={'contain'}
							transition={200}
							cachePolicy={'memory-disk'}
							recyclingKey={track.id.value}
						/>
					) : (
						<Icon as={Music} size={24} color={colors.onSurfaceVariant} />
					)}
					{isCurrentlyPlaying && <AudioWaveform />}
				</View>
				{!downloadInfo && <DownloadIndicator trackId={track.id.value} size={'sm'} />}
			</View>

			<View style={styles.infoContainer}>
				<Text
					variant={'bodyLarge'}
					numberOfLines={1}
					style={{ color: isActiveTrack ? colors.primary : colors.onSurface }}
				>
					{track.title}
				</Text>
				<Text
					variant={'bodyMedium'}
					numberOfLines={1}
					style={{ color: colors.onSurfaceVariant }}
				>
					{artistNames}
					{albumName && !downloadInfo ? ` · ${albumName}` : ''}
					{downloadInfo && !track.duration.isZero() ? ` · ${duration}` : ''}
					{showProviderLabel && pluginManifest
						? ` · ${pluginManifest.shortName ?? pluginManifest.name}`
						: ''}
				</Text>
				{downloadInfo && <DownloadStatus downloadInfo={downloadInfo} colors={colors} />}
				{isDownloading && (
					<View style={styles.progressBarContainer}>
						<ProgressBar
							progress={downloadInfo.progress / 100}
							color={colors.primary}
							indeterminate={downloadInfo.progress === 0}
							style={styles.progressBar}
						/>
					</View>
				)}
			</View>

			{downloadInfo ? (
				<DownloadActions
					downloadInfo={downloadInfo}
					track={track}
					colors={colors}
					onRemove={handleRemoveDownload}
					onRetry={onRetry}
				/>
			) : (
				<>
					{!track.duration.isZero() && (
						<Text
							variant={'bodySmall'}
							style={[
								styles.duration,
								{
									color: isActiveTrack ? colors.primary : colors.onSurfaceVariant,
									fontVariant: isActiveTrack ? ['tabular-nums'] : [],
								},
							]}
						>
							{displayTime}
						</Text>
					)}
					{!hideOptionsMenu && (
						<TrackOptionsMenu
							track={track}
							source={source}
							playlistId={playlistId}
							trackPosition={trackPosition}
						/>
					)}
				</>
			)}
		</TouchableOpacity>
	);
});
