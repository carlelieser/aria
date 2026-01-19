import { memo, useEffect, useRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	FadeIn,
	FadeOut,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import type { AnimationObject } from 'lottie-react-native';

const LABEL_HEIGHT = 18;
const ICON_SIZE = 28;
const TAB_SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 };

function hexToRgbArray(hex: string): [number, number, number, number] {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return [0, 0, 0, 1];
	return [
		parseInt(result[1], 16) / 255,
		parseInt(result[2], 16) / 255,
		parseInt(result[3], 16) / 255,
		1,
	];
}

function replaceColorsInSource(source: AnimationObject, color: string): AnimationObject {
	const rgbArray = hexToRgbArray(color);
	const json = JSON.stringify(source);

	// Replace color arrays in the format [r, g, b, a] where values are 0-1
	const replaced = json.replace(
		/"c"\s*:\s*\{\s*"a"\s*:\s*0\s*,\s*"k"\s*:\s*\[\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\]/g,
		`"c":{"a":0,"k":[${rgbArray.join(',')}]`
	);

	return JSON.parse(replaced) as AnimationObject;
}

interface LottieTabIconProps {
	readonly source: AnimationObject;
	readonly isFocused: boolean;
	readonly focusedColor: string;
	readonly inactiveColor: string;
	readonly showNotificationDot: boolean;
}

export const LottieTabIcon = memo(function LottieTabIcon({
	source,
	isFocused,
	focusedColor,
	inactiveColor,
	showNotificationDot,
}: LottieTabIconProps) {
	const lottieRef = useRef<LottieView>(null);
	const wasFocusedRef = useRef(isFocused);
	const translateY = useSharedValue(isFocused ? 0 : LABEL_HEIGHT / 2);

	useEffect(() => {
		translateY.value = withSpring(isFocused ? 0 : LABEL_HEIGHT / 2, TAB_SPRING_CONFIG);
	}, [isFocused, translateY]);

	useEffect(() => {
		if (isFocused && !wasFocusedRef.current) {
			// Reset and play after a frame to ensure new source is applied
			requestAnimationFrame(() => {
				lottieRef.current?.reset();
				lottieRef.current?.play();
			});
		}
		wasFocusedRef.current = isFocused;
	}, [isFocused]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	const currentColor = isFocused ? focusedColor : inactiveColor;
	const coloredSource = useMemo(
		() => replaceColorsInSource(source, currentColor),
		[source, currentColor]
	);

	return (
		<Animated.View style={[styles.iconContainer, animatedStyle]}>
			<LottieView
				ref={lottieRef}
				source={coloredSource}
				style={styles.lottie}
				autoPlay={false}
				loop={false}
				speed={1}
			/>
			{showNotificationDot && (
				<Animated.View
					entering={FadeIn.duration(200)}
					exiting={FadeOut.duration(200)}
					style={[styles.notificationDot, { backgroundColor: focusedColor }]}
				/>
			)}
		</Animated.View>
	);
});

const styles = StyleSheet.create({
	iconContainer: {
		position: 'relative',
		width: ICON_SIZE,
		height: ICON_SIZE,
		justifyContent: 'center',
		alignItems: 'center',
	},
	lottie: {
		width: ICON_SIZE,
		height: ICON_SIZE,
	},
	notificationDot: {
		position: 'absolute',
		top: 0,
		right: 0,
		width: 8,
		height: 8,
		borderRadius: 4,
	},
});
