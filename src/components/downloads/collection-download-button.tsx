/**
 * CollectionDownloadButton
 *
 * Download button for collections (albums, playlists) with proper states:
 * - Not downloaded: Shows download icon
 * - Partially downloaded: Shows download icon with progress ring
 * - Downloading (initial): Shows spinner with progress ring (disabled)
 * - Downloading (active): Shows pause icon with progress ring (tap to cancel)
 * - Fully downloaded: Shows checkmark icon
 */

import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { DownloadIcon, CheckIcon, PauseIcon } from 'lucide-react-native';
import { IconButton, ActivityIndicator } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { ProgressRing } from '@/src/components/ui/progress-ring';
import {
	useCollectionDownloadState,
	type DownloadState,
} from '@/src/hooks/use-collection-download-state';
import { useDetailsPageHeaderColors } from '@/src/components/details-page';
import type { Track } from '@/src/domain/entities/track';

interface CollectionDownloadButtonProps {
	readonly tracks: readonly Track[];
	readonly isDownloading: boolean;
	readonly onDownload: () => void;
	readonly onCancel?: () => void;
	readonly size?: number;
}

export const CollectionDownloadButton = memo(function CollectionDownloadButton({
	tracks,
	isDownloading,
	onDownload,
	onCancel,
	size = 22,
}: CollectionDownloadButtonProps) {
	const colors = useDetailsPageHeaderColors();
	const { state, downloadedCount, totalCount } = useCollectionDownloadState(tracks);

	const effectiveState: DownloadState = isDownloading ? 'downloading' : state;

	const progressValue = useMemo(() => {
		if (totalCount > 0) {
			return downloadedCount / totalCount;
		}
		return 0;
	}, [downloadedCount, totalCount]);

	const isInitialLoading = effectiveState === 'downloading' && progressValue === 0;

	const iconColor = useMemo(() => {
		switch (effectiveState) {
			case 'complete':
			case 'downloading':
				return colors.primary;
			case 'partial':
			default:
				return colors.onSurface;
		}
	}, [effectiveState, colors]);

	const icon = useMemo(() => {
		if (effectiveState === 'complete') {
			return <Icon as={CheckIcon} size={size} color={iconColor} />;
		}

		if (effectiveState === 'downloading') {
			return (
				<View style={styles.downloadingContainer}>
					<ProgressRing
						progress={progressValue}
						size={size + 8}
						strokeWidth={2}
						color={colors.primary}
						backgroundColor={colors.surfaceContainerHighest}
					/>
					<View style={styles.centerIcon}>
						<Icon as={PauseIcon} size={size - 4} color={iconColor} />
					</View>
				</View>
			);
		}

		if (effectiveState === 'partial') {
			return (
				<View style={styles.partialContainer}>
					<ProgressRing
						progress={progressValue}
						size={size + 8}
						strokeWidth={2}
						color={colors.primary}
						backgroundColor={colors.surfaceContainerHighest}
					/>
					<View style={styles.centerIcon}>
						<Icon as={DownloadIcon} size={size - 4} color={iconColor} />
					</View>
				</View>
			);
		}

		return <Icon as={DownloadIcon} size={size} color={iconColor} />;
	}, [effectiveState, size, iconColor, progressValue, colors]);

	const handlePress = useMemo(() => {
		if (effectiveState === 'downloading' && onCancel) {
			return onCancel;
		}
		return onDownload;
	}, [effectiveState, onCancel, onDownload]);

	if (isInitialLoading) {
		return (
			<View style={styles.spinnerContainer}>
				<ActivityIndicator size={size} color={colors.primary} />
			</View>
		);
	}

	return (
		<IconButton
			icon={() => icon}
			onPress={handlePress}
			disabled={effectiveState === 'complete'}
			style={styles.button}
		/>
	);
});

const styles = StyleSheet.create({
	button: {
		margin: 0,
	},
	spinnerContainer: {
		width: 48,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	downloadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	partialContainer: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	centerIcon: {
		position: 'absolute',
	},
});
