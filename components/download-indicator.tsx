import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	withSpring,
	Easing,
} from 'react-native-reanimated';
import { CheckIcon, AlertCircleIcon, ArrowDownIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useDownloadStatus } from '@/hooks/use-download-status';

interface DownloadIndicatorProps {
	trackId: string;
	size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
	sm: { container: 16, icon: 10, offset: -2 },
	md: { container: 20, icon: 12, offset: -4 },
	lg: { container: 24, icon: 14, offset: -6 },
};

export const DownloadIndicator = memo(function DownloadIndicator({
	trackId,
	size = 'sm',
}: DownloadIndicatorProps) {
	const { isDownloaded, isDownloading, status, progress } = useDownloadStatus(trackId);

	const rotation = useSharedValue(0);
	const scale = useSharedValue(0);
	const opacity = useSharedValue(0);

	const config = SIZE_CONFIG[size];

	useEffect(() => {
		if (isDownloading) {
			rotation.value = withRepeat(
				withTiming(360, { duration: 1500, easing: Easing.linear }),
				-1,
				false
			);
			scale.value = withSpring(1, { damping: 15, stiffness: 300 });
			opacity.value = withTiming(1, { duration: 200 });
		} else if (isDownloaded || status === 'failed') {
			rotation.value = 0;
			scale.value = withSpring(1, { damping: 15, stiffness: 300 });
			opacity.value = withTiming(1, { duration: 200 });
		} else {
			scale.value = withSpring(0, { damping: 15, stiffness: 300 });
			opacity.value = withTiming(0, { duration: 200 });
		}
	}, [isDownloading, isDownloaded, status, rotation, scale, opacity]);

	const animatedContainerStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	const animatedIconStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}));

	if (!isDownloaded && !isDownloading && status !== 'failed') {
		return null;
	}

	const renderIcon = () => {
		if (isDownloading) {
			return (
				<Animated.View style={animatedIconStyle}>
					<Icon as={ArrowDownIcon} size={config.icon} className="text-white" />
				</Animated.View>
			);
		}

		if (status === 'failed') {
			return <Icon as={AlertCircleIcon} size={config.icon} className="text-white" />;
		}

		if (isDownloaded) {
			return <Icon as={CheckIcon} size={config.icon} className="text-white" />;
		}

		return null;
	};

	const getBackgroundColor = () => {
		if (status === 'failed') return 'bg-destructive';
		if (isDownloading) return 'bg-primary';
		if (isDownloaded) return 'bg-green-600';
		return 'bg-primary';
	};

	return (
		<Animated.View
			style={[
				animatedContainerStyle,
				{
					position: 'absolute',
					bottom: config.offset,
					right: config.offset,
					width: config.container,
					height: config.container,
					borderRadius: config.container / 2,
				},
			]}
			className={`items-center justify-center ${getBackgroundColor()} border border-background`}
		>
			{isDownloading && progress > 0 && progress < 100 && (
				<View
					className="absolute inset-0 rounded-full bg-white/20"
					style={{
						width: `${progress}%`,
						borderRadius: config.container / 2,
					}}
				/>
			)}
			{renderIcon()}
		</Animated.View>
	);
});
