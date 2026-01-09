import { memo, useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
	CheckCircleIcon,
	AlertCircleIcon,
	XIcon,
	TrashIcon,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
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

interface TrackListItemProps {
	track: Track;
	source?: TrackActionSource;
	onPress?: (track: Track) => void;
	/** When provided, shows download-specific UI (progress, status, actions) */
	downloadInfo?: DownloadInfo;
	/** Hide the options menu (useful in download context) */
	hideOptionsMenu?: boolean;
}

export const TrackListItem = memo(function TrackListItem({
	track,
	source = 'library',
	onPress,
	downloadInfo,
	hideOptionsMenu = false,
}: TrackListItemProps) {
	const { play } = usePlayer();
	const { removeDownload } = useDownloadActions();

	const handlePress = useCallback(() => {
		if (onPress) {
			onPress(track);
		} else {
			router.push('/player');
			play(track);
		}
	}, [onPress, track, play]);

	const handleRemoveDownload = useCallback(async () => {
		if (downloadInfo) {
			await removeDownload(downloadInfo.trackId);
		}
	}, [removeDownload, downloadInfo]);

	const artwork = getBestArtwork(track.artwork, 48);
	const artworkUrl = artwork?.url;
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
				<View className="flex-row items-center gap-2">
					<Text variant="muted" className="text-xs">
						{downloadInfo.progress}%
					</Text>
				</View>
			);
		}

		if (isDownloadCompleted && downloadInfo.fileSize && downloadInfo.downloadedAt) {
			return (
				<View className="flex-row items-center gap-2">
					<Icon as={CheckCircleIcon} size={12} className="text-green-600" />
					<Text variant="muted" className="text-xs">
						{formatFileSize(downloadInfo.fileSize)} · {formatDate(downloadInfo.downloadedAt)}
					</Text>
				</View>
			);
		}

		if (isDownloadFailed) {
			return (
				<View className="flex-row items-center gap-2">
					<Icon as={AlertCircleIcon} size={12} className="text-destructive" />
					<Text variant="muted" className="text-xs text-destructive" numberOfLines={1}>
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
				<Button variant="ghost" size="icon" onPress={handleRemoveDownload}>
					<Icon as={XIcon} size={20} className="text-muted-foreground" />
				</Button>
			);
		}

		if (isDownloadCompleted || isDownloadFailed) {
			return (
				<Button variant="ghost" size="icon" onPress={handleRemoveDownload}>
					<Icon as={TrashIcon} size={20} className="text-muted-foreground" />
				</Button>
			);
		}

		return null;
	};

	return (
		<TouchableOpacity
			className="flex flex-row items-center w-full gap-4 py-3"
			onPress={handlePress}
			activeOpacity={0.7}
		>
			<View className="relative">
				<Image
					source={{ uri: artworkUrl }}
					style={{
						width: 48,
						height: 48,
						borderRadius: 8,
					}}
					contentFit="cover"
					transition={200}
					cachePolicy="memory-disk"
					recyclingKey={track.id.value}
				/>
				{!downloadInfo && <DownloadIndicator trackId={track.id.value} size="sm" />}
			</View>

			<View className="flex flex-col gap-1 flex-1">
				<Text numberOfLines={1} className="font-medium">
					{track.title}
				</Text>
				<Text variant="muted" numberOfLines={1}>
					{artistNames}
					{albumName && !downloadInfo ? ` · ${albumName}` : ''}
				</Text>
				{renderDownloadStatus()}
				{isDownloading && (
					<View className="mt-1">
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
					<Text variant="muted" className="text-sm">
						{duration}
					</Text>
					{!hideOptionsMenu && <TrackOptionsMenu track={track} source={source} />}
				</>
			)}
		</TouchableOpacity>
	);
});
