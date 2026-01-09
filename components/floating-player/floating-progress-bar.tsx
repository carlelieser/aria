import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	Easing,
} from 'react-native-reanimated';
import { usePlaybackProgress } from '@/src/application/state/player-store';

const TRACK_HEIGHT = 3;

const ANIMATION_DURATION_MS = 100;

export function FloatingProgressBar() {
	const { percentage } = usePlaybackProgress();
	const animatedPercentage = useSharedValue(percentage);

	useEffect(() => {
		animatedPercentage.value = withTiming(percentage, {
			duration: ANIMATION_DURATION_MS,
			easing: Easing.linear,
		});
	}, [percentage, animatedPercentage]);

	const animatedStyle = useAnimatedStyle(() => ({
		width: `${animatedPercentage.value}%`,
	}));

	return (
		<View
			className="w-full bg-muted/30 rounded-full overflow-hidden"
			style={{ height: TRACK_HEIGHT }}
		>
			<Animated.View className="h-full bg-primary rounded-full" style={animatedStyle} />
		</View>
	);
}
