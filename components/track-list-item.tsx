/**
 * TrackListItem Component
 *
 * Displays a track in a list format with artwork, info, and actions.
 * Uses M3 theming.
 */

import { memo, useCallback } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { CheckCircle, AlertCircle, X, Trash2 } from 'lucide-react-native';
import { Text, IconButton } from 'react-native-paper';

import { Icon } from '@/components/ui/icon';
import { usePlayer } from '@/hooks/use-player';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import { TrackOptionsMenu } from '@/components/track-options-menu';
import { DownloadIndicator } from '@/components/download-indicator';
import { StaticProgressBar } from '@/components/download-progress-bar';
import { useDownloadActions } from '@/hooks/use-download-actions';
import { formatFileSize } from '@/hooks/use-download-queue';
import { useAppTheme, M3Shapes } from '@/lib/theme';

interface TrackListItemProps {
	track: Track;
	source?: TrackActionSource;
	onPress?: (track: Track) => void;
	onLongPress?: (track: Track) => void;
	/** When provided, shows download-specific UI (progress, status, actions) */
	downloadInfo?: DownloadInfo;
	/** Hide the options menu (useful in download context) */
	hideOptionsMenu?: boolean;
	/** Fallback artwork URL when track has no artwork (e.g., album artwork) */
	fallbackArtworkUrl?: string;
	/** Queue of tracks for skip next/previous functionality */
	queue?: Track[];
	/** Index of this track in the queue */
	queueIndex?: number;
	/** Playlist ID when displaying tracks from a playlist */
	playlistId?: string;
	/** Track position within the playlist */
	trackPosition?: number;
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
}: TrackListItemProps) {
	const { play, playQueue } = usePlayer();
	const { removeDownload } = useDownloadActions();
	const { colors } = useAppTheme();

	const handlePress = useCallback(() => {
		if (onPress) {
			onPress(track);
		} else {
			if (queue && queueIndex !== undefined) {
				playQueue(queue, queueIndex);
			} else {
				play(track);
			}
			router.push('/player');
		}
	}, [onPress, track, play, playQueue, queue, queueIndex]);

	const handleLongPress = useCallback(() => {
		onLongPress?.(track);
	}, [onLongPress, track]);

	const handleRemoveDownload = useCallback(async () => {
		if (downloadInfo) {
			await removeDownload(downloadInfo.trackId);
		}
	}, [removeDownload, downloadInfo]);

	const artwork = getBestArtwork(track.artwork, 48);
	const artworkUrl = artwork?.url ?? fallbackArtworkUrl;
	const artistNames = getArtistNames(track);
	const albumName = track.album?.name;
	const duration = track.duration.format();

	const isDownloading =
		downloadInfo?.status === 'pending' || downloadInfo?.status === 'downloading';
	const isDownloadCompleted = downloadInfo?.status === 'completed';
	const isDownloadFailed = downloadInfo?.status === 'failed';

	const formatDate = (timestamp: number) => {
		const date = new Date(timestamp);
		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const renderDownloadStatus = () => {
		if (!downloadInfo) return null;

		if (isDownloading) {
			return (
				<View style={styles.statusRow}>
					<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
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
						variant="bodySmall"
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
						variant="bodySmall"
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
			<View style={styles.artworkContainer}>
				<Image
					source={{ uri: artworkUrl }}
					style={styles.artwork}
					contentFit="cover"
					transition={200}
					cachePolicy="memory-disk"
					recyclingKey={track.id.value}
				/>
				{!downloadInfo && <DownloadIndicator trackId={track.id.value} size="sm" />}
			</View>

			<View style={styles.infoContainer}>
				<Text variant="bodyLarge" numberOfLines={1} style={{ color: colors.onSurface }}>
					{track.title}
				</Text>
				<Text
					variant="bodyMedium"
					numberOfLines={1}
					style={{ color: colors.onSurfaceVariant }}
				>
					{artistNames}
					{albumName && !downloadInfo ? ` · ${albumName}` : ''}
				</Text>
				{renderDownloadStatus()}
				{isDownloading && (
					<View style={styles.progressBarContainer}>
						<StaticProgressBar
							progress={downloadInfo.progress}
							status={downloadInfo.status}
							height={3}
						/>
					</View>
				)}
			</View>

			{downloadInfo ? (
				renderDownloadActions()
			) : (
				<>
					<Text
						variant="bodySmall"
						style={[styles.duration, { color: colors.onSurfaceVariant }]}
					>
						{duration}
					</Text>
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
	artworkContainer: {
		position: 'relative',
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
	duration: {
		marginRight: 4,
	},
});
