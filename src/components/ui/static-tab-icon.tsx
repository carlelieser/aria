import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';

const LABEL_HEIGHT = 18;
const ICON_SIZE = 28;
const TAB_SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 };

interface StaticTabIconProps {
	readonly icon: LucideIcon;
	readonly isFocused: boolean;
	readonly focusedColor: string;
	readonly inactiveColor: string;
}

export const StaticTabIcon = memo(function StaticTabIcon({
	icon: IconComponent,
	isFocused,
	focusedColor,
	inactiveColor,
}: StaticTabIconProps) {
	const translateY = useSharedValue(isFocused ? 0 : LABEL_HEIGHT / 2);

	useEffect(() => {
		translateY.value = withSpring(isFocused ? 0 : LABEL_HEIGHT / 2, TAB_SPRING_CONFIG);
	}, [isFocused, translateY]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	const currentColor = isFocused ? focusedColor : inactiveColor;

	return (
		<Animated.View style={[styles.iconContainer, animatedStyle]}>
			<IconComponent size={ICON_SIZE} color={currentColor} />
		</Animated.View>
	);
});

const styles = StyleSheet.create({
	iconContainer: {
		width: ICON_SIZE,
		height: ICON_SIZE,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
