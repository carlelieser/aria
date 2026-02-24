/**
 * TrackListItem Component
 *
 * Displays a track in a list format with artwork, info, and actions.
 * Uses M3 theming. Reflects live playback state: waveform overlay on artwork,
 * primary-colored title, and live position instead of static duration.
 */

import { memo, useCallback, useRef } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CheckCircle, AlertCircle, X, Trash2, Music, RotateCcw } from 'lucide-react-native';
import { Text, IconButton, ProgressBar } from 'react-native-paper';

import { Icon } from '@/src/components/ui/icon';
import { AudioWaveform } from '@/src/components/ui/audio-waveform';
import { usePlayerActions } from '@/src/hooks/use-player';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { formatDate } from '@/src/domain/utils/formatting';
import { getArtistNames } from '@/src/domain/entities/track';
import { useTrackPlaybackInfo } from '@/src/application/state/player-store';
import { TrackOptionsMenu } from '@/src/components/track-options-menu';
import { DownloadIndicator } from './download-indicator';
import { useDownloadActions } from '@/src/hooks/use-download-actions';
import { formatFileSize } from '@/src/hooks/use-download-queue';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { useOpenPlayerOnTrackClick } from '@/src/application/state/settings-store';
import { router } from 'expo-router';

interface TrackListItemProps {
	readonly track: Track;
	readonly source?: TrackActionSource;
	readonly onPress?: (track: Track) => void;
	readonly onLongPress?: (track: Track) => void;
	/** When provided, shows download-specific UI (progress, status, actions) */
	readonly downloadInfo?: DownloadInfo;
	/** Hide the options menu (useful in download context) */
	readonly hideOptionsMenu?: boolean;
	/** Fallback artwork URL when track has no artwork (e.g., album artwork) */
	readonly fallbackArtworkUrl?: string;
	/** Queue of tracks for skip next/previous functionality */
	readonly queue?: Track[];
	/** Index of this track in the queue */
	readonly queueIndex?: number;
	/** Playlist ID when displaying tracks from a playlist */
	readonly playlistId?: string;
	/** Track position within the playlist */
	readonly trackPosition?: number;
	/** Callback for retrying failed downloads */
	readonly onRetry?: (track: Track) => void;
}

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

	const artwork = getBestArtwork(track.artwork, 300);
	const artworkUrl = artwork?.url ?? fallbackArtworkUrl;
	const artistNames = getArtistNames(track);
	const albumName = track.album?.name;
	const duration = track.duration.format();
	const displayTime = formattedPosition ?? duration;

	const isDownloading =
		downloadInfo?.status === 'pending' || downloadInfo?.status === 'downloading';
	const isDownloadCompleted = downloadInfo?.status === 'completed';
	const isDownloadFailed = downloadInfo?.status === 'failed';

	const renderDownloadStatus = () => {
		if (!downloadInfo) return null;

		if (isDownloading && downloadInfo.progress > 0) {
			return (
				<View style={styles.statusRow}>
					<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
						{downloadInfo.progress}%
					</Text>
				</View>
			);
		}

		if (isDownloadCompleted && downloadInfo.fileSize && downloadInfo.downloadedAt) {
			return (
				<View style={styles.statusRow}>
					<Icon as={CheckCircle} size={12} color={colors.primary} />
					<Text
						variant={'bodySmall'}
						style={[styles.statusText, { color: colors.onSurfaceVariant }]}
					>
						{formatFileSize(downloadInfo.fileSize)} ·{' '}
						{formatDate(downloadInfo.downloadedAt)}
					</Text>
				</View>
			);
		}

		if (isDownloadFailed) {
			return (
				<View style={styles.statusRow}>
					<Icon as={AlertCircle} size={12} color={colors.error} />
					<Text
						variant={'bodySmall'}
						numberOfLines={1}
						style={[styles.statusText, { color: colors.error }]}
					>
						{downloadInfo.error ?? 'Download failed'}
					</Text>
				</View>
			);
		}

		return null;
	};

	const renderDownloadActions = () => {
		if (!downloadInfo) return null;

		if (isDownloading) {
			return (
				<IconButton
					icon={({ size }) => <X size={size} color={colors.onSurfaceVariant} />}
					size={20}
					onPress={handleRemoveDownload}
				/>
			);
		}

		if (isDownloadCompleted) {
			return (
				<IconButton
					icon={({ size }) => <Trash2 size={size} color={colors.onSurfaceVariant} />}
					size={20}
					onPress={handleRemoveDownload}
				/>
			);
		}

		if (isDownloadFailed && onRetry) {
			return (
				<IconButton
					icon={({ size }) => <RotateCcw size={size} color={colors.onSurfaceVariant} />}
					size={20}
					onPress={() => onRetry(track)}
				/>
			);
		}

		return null;
	};

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
							contentFit={'cover'}
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
				</Text>
				{renderDownloadStatus()}
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
				renderDownloadActions()
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

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		gap: 16,
		paddingVertical: 12,
	},
	artworkWrapper: {
		position: 'relative',
	},
	artworkContainer: {
		width: 48,
		height: 48,
		borderRadius: M3Shapes.small,
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	artwork: {
		width: 48,
		height: 48,
		borderRadius: M3Shapes.small,
	},
	infoContainer: {
		flex: 1,
		flexDirection: 'column',
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 2,
	},
	statusText: {
		marginLeft: 4,
	},
	progressBarContainer: {
		marginTop: 4,
	},
	progressBar: {
		height: 3,
		borderRadius: 9999,
	},
	duration: {
		marginRight: 4,
	},
});
