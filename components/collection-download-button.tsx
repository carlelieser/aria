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

import { memo, useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	Easing,
	useAnimatedProps,
} from 'react-native-reanimated';
import { Svg, Circle } from 'react-native-svg';
import { DownloadIcon, CheckIcon, Loader2Icon, PauseIcon } from 'lucide-react-native';
import { IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { useDownloadStore } from '@/src/application/state/download-store';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type DownloadState = 'none' | 'partial' | 'downloading' | 'complete';

interface CollectionDownloadButtonProps {
	readonly tracks: readonly Track[];
	readonly isDownloading: boolean;
	readonly progress?: { completed: number; total: number };
	readonly onDownload: () => void;
	readonly onCancel?: () => void;
	readonly size?: number;
}

function useCollectionDownloadState(tracks: readonly Track[]): {
	state: DownloadState;
	downloadedCount: number;
	totalCount: number;
} {
	const downloadedTracks = useDownloadStore((s) => s.downloadedTracks);
	const downloads = useDownloadStore((s) => s.downloads);

	return useMemo(() => {
		if (tracks.length === 0) {
			return { state: 'none', downloadedCount: 0, totalCount: 0 };
		}

		let downloadedCount = 0;
		let downloadingCount = 0;

		for (const track of tracks) {
			const trackId = track.id.value;
			if (downloadedTracks.has(trackId)) {
				downloadedCount++;
			} else {
				const info = downloads.get(trackId);
				if (info && (info.status === 'pending' || info.status === 'downloading')) {
					downloadingCount++;
				}
			}
		}

		const totalCount = tracks.length;

		if (downloadingCount > 0) {
			return { state: 'downloading', downloadedCount, totalCount };
		}

		if (downloadedCount === totalCount) {
			return { state: 'complete', downloadedCount, totalCount };
		}

		if (downloadedCount > 0) {
			return { state: 'partial', downloadedCount, totalCount };
		}

		return { state: 'none', downloadedCount, totalCount };
	}, [tracks, downloadedTracks, downloads]);
}

export const CollectionDownloadButton = memo(function CollectionDownloadButton({
	tracks,
	isDownloading,
	progress,
	onDownload,
	onCancel,
	size = 22,
}: CollectionDownloadButtonProps) {
	const { colors } = useAppTheme();
	const { state, downloadedCount, totalCount } = useCollectionDownloadState(tracks);

	const effectiveState: DownloadState = isDownloading ? 'downloading' : state;

	const progressValue = useMemo(() => {
		if (progress && progress.total > 0) {
			return progress.completed / progress.total;
		}
		if (totalCount > 0) {
			return downloadedCount / totalCount;
		}
		return 0;
	}, [progress, downloadedCount, totalCount]);

	const isInitialLoading = effectiveState === 'downloading' && progressValue === 0;

	const rotation = useSharedValue(0);

	useEffect(() => {
		if (isInitialLoading) {
			rotation.value = withRepeat(
				withTiming(360, { duration: 1000, easing: Easing.linear }),
				-1,
				false
			);
		} else {
			rotation.value = 0;
		}
	}, [isInitialLoading, rotation]);

	const animatedRotationStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}));

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
				<Animated.View style={animatedRotationStyle}>
					<Icon as={Loader2Icon} size={size} color={colors.primary} />
				</Animated.View>
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

interface ProgressRingProps {
	progress: number;
	size: number;
	strokeWidth: number;
	color: string;
	backgroundColor: string;
}

const ProgressRing = memo(function ProgressRing({
	progress,
	size,
	strokeWidth,
	color,
	backgroundColor,
}: ProgressRingProps) {
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;

	const animatedProgress = useSharedValue(progress);

	useEffect(() => {
		animatedProgress.value = withTiming(progress, { duration: 300 });
	}, [progress, animatedProgress]);

	const animatedProps = useAnimatedProps(() => ({
		strokeDashoffset: circumference * (1 - animatedProgress.value),
	}));

	return (
		<Svg width={size} height={size} style={styles.progressRing}>
			<Circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke={backgroundColor}
				strokeWidth={strokeWidth}
				fill="none"
			/>
			<AnimatedCircle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke={color}
				strokeWidth={strokeWidth}
				fill="none"
				strokeDasharray={circumference}
				animatedProps={animatedProps}
				strokeLinecap="round"
				rotation={-90}
				origin={`${size / 2}, ${size / 2}`}
			/>
		</Svg>
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
	progressRing: {
		position: 'absolute',
	},
	centerIcon: {
		position: 'absolute',
	},
});
