import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	Easing,
} from 'react-native-reanimated';
import { useDownloadStatus } from '@/hooks/use-download-status';

interface DownloadProgressBarProps {
	trackId: string;
	height?: number;
	showOnlyWhenDownloading?: boolean;
}

export const DownloadProgressBar = memo(function DownloadProgressBar({
	trackId,
	height = 2,
	showOnlyWhenDownloading = true,
}: DownloadProgressBarProps) {
	const { isDownloading, progress, status } = useDownloadStatus(trackId);

	const animatedProgress = useSharedValue(0);
	const containerOpacity = useSharedValue(0);

	useEffect(() => {
		animatedProgress.value = withTiming(progress, {
			duration: 300,
			easing: Easing.out(Easing.ease),
		});
	}, [progress, animatedProgress]);

	useEffect(() => {
		if (isDownloading) {
			containerOpacity.value = withTiming(1, { duration: 200 });
		} else if (showOnlyWhenDownloading) {
			containerOpacity.value = withTiming(0, { duration: 200 });
		} else if (status === 'completed') {
			containerOpacity.value = withTiming(1, { duration: 200 });
		} else {
			containerOpacity.value = withTiming(0, { duration: 200 });
		}
	}, [isDownloading, showOnlyWhenDownloading, status, containerOpacity]);

	const progressStyle = useAnimatedStyle(() => ({
		width: `${animatedProgress.value}%`,
	}));

	const containerStyle = useAnimatedStyle(() => ({
		opacity: containerOpacity.value,
	}));

	if (showOnlyWhenDownloading && !isDownloading) {
		return null;
	}

	const getProgressColor = () => {
		if (status === 'failed') return 'bg-destructive';
		if (status === 'completed') return 'bg-green-600';
		return 'bg-primary';
	};

	return (
		<Animated.View
			style={[containerStyle, { height }]}
			className="w-full rounded-full bg-muted/30 overflow-hidden"
		>
			<Animated.View
				style={[progressStyle, { height }]}
				className={`rounded-full ${getProgressColor()}`}
			/>
		</Animated.View>
	);
});

interface StaticProgressBarProps {
	progress: number;
	height?: number;
	status?: 'downloading' | 'completed' | 'failed' | 'pending';
}

export const StaticProgressBar = memo(function StaticProgressBar({
	progress,
	height = 2,
	status = 'downloading',
}: StaticProgressBarProps) {
	const getProgressColor = () => {
		if (status === 'failed') return 'bg-destructive';
		if (status === 'completed') return 'bg-green-600';
		return 'bg-primary';
	};

	return (
		<View style={{ height }} className="w-full rounded-full bg-muted/30 overflow-hidden">
			<View
				style={{ height, width: `${progress}%` }}
				className={`rounded-full ${getProgressColor()}`}
			/>
		</View>
	);
});
