/**
 * FloatingProgressBar Component
 *
 * Thin progress bar for the floating mini player.
 * Driven entirely by Reanimated shared values so progress updates
 * animate on the UI thread without triggering React re-renders.
 */

import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useAnimatedProgress } from '@/src/hooks/use-animated-progress';
import { useAppTheme } from '@/lib/theme';

export function FloatingProgressBar() {
	const progress = useAnimatedProgress();
	const { colors } = useAppTheme();

	const progressStyle = useAnimatedStyle(() => ({
		width: `${progress.value * 100}%`,
	}));

	return (
		<View style={styles.track}>
			<Animated.View
				style={[styles.fill, { backgroundColor: colors.primary }, progressStyle]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	track: {
		height: 3,
		borderRadius: 1.5,
		overflow: 'hidden',
	},
	fill: {
		height: '100%',
		borderRadius: 1.5,
	},
});
