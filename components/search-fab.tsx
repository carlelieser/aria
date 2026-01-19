/**
 * SearchFAB Component
 *
 * Floating action button for search navigation.
 * Only renders on Library and Downloads tabs.
 */

import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { FAB } from 'react-native-paper';
import { Search } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { useCallback } from 'react';
import { useCurrentTrack } from '@/src/application/state/player-store';
import { useAppTheme } from '@/lib/theme';

const FLOATING_PLAYER_HEIGHT = 64;
const FLOATING_PLAYER_MARGIN = 8;
const FAB_BASE_BOTTOM = 110;

const VISIBLE_ROUTES = ['/', '/downloads'];

export function SearchFAB() {
	const currentTrack = useCurrentTrack();
	const { colors } = useAppTheme();
	const pathname = usePathname();

	const isFloatingPlayerVisible = currentTrack !== null;
	const shouldRender = VISIBLE_ROUTES.includes(pathname);

	const animatedStyle = useAnimatedStyle(() => {
		const floatingPlayerOffset = isFloatingPlayerVisible
			? FLOATING_PLAYER_HEIGHT + FLOATING_PLAYER_MARGIN
			: 0;
		const bottomPosition = FAB_BASE_BOTTOM + floatingPlayerOffset;

		return {
			bottom: withTiming(bottomPosition, { duration: 200 }),
		};
	}, [isFloatingPlayerVisible]);

	const handlePress = useCallback(() => {
		router.push('/search');
	}, []);

	if (!shouldRender) {
		return null;
	}

	return (
		<Animated.View style={[styles.container, animatedStyle]}>
			<FAB
				icon={({ size, color }) => <Search size={22} color={color} />}
				onPress={handlePress}
				style={[styles.fab, { backgroundColor: colors.primaryContainer }]}
				color={colors.onPrimaryContainer}
				size="medium"
			/>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		right: 24,
	},
	fab: {
		elevation: 4,
	},
});
