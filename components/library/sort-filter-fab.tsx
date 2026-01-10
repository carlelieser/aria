/**
 * SortFilterFAB Component
 *
 * Floating action button for sort/filter actions.
 * Uses M3 FAB component.
 */

import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { FAB, Badge } from 'react-native-paper';
import { ListFilter } from 'lucide-react-native';
import { useCurrentTrack } from '@/src/application/state/player-store';
import { useAppTheme } from '@/lib/theme';

const FLOATING_PLAYER_HEIGHT = 64;
const FLOATING_PLAYER_MARGIN = 8;
const FAB_BASE_BOTTOM = 16;

interface SortFilterFABProps {
	filterCount: number;
	onPress: () => void;
}

export function SortFilterFAB({ filterCount, onPress }: SortFilterFABProps) {
	const currentTrack = useCurrentTrack();
	const { colors } = useAppTheme();
	const isFloatingPlayerVisible = currentTrack !== null;

	const animatedStyle = useAnimatedStyle(() => {
		const floatingPlayerOffset = isFloatingPlayerVisible
			? FLOATING_PLAYER_HEIGHT + FLOATING_PLAYER_MARGIN
			: 0;
		const bottomPosition = FAB_BASE_BOTTOM + floatingPlayerOffset;

		return {
			bottom: withTiming(bottomPosition, { duration: 200 }),
		};
	}, [isFloatingPlayerVisible]);

	return (
		<Animated.View style={[styles.container, animatedStyle]}>
			<View>
				<FAB
					icon={({ size, color }) => <ListFilter size={22} color={color} />}
					onPress={onPress}
					style={[styles.fab, { backgroundColor: colors.secondaryContainer }]}
					color={colors.onSecondaryContainer}
					size="medium"
				/>
				{filterCount > 0 && (
					<Badge size={20} style={[styles.badge, { backgroundColor: colors.error }]}>
						{filterCount}
					</Badge>
				)}
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		right: 16,
	},
	fab: {
		elevation: 4,
	},
	badge: {
		position: 'absolute',
		top: -4,
		right: -4,
	},
});
