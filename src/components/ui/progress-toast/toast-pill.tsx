/**
 * ToastPill Component
 *
 * Minimized pill view of the progress toast showing percentage and spinner.
 */

import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Portal } from '@rn-primitives/portal';
import Animated from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';
import { useAppTheme } from '@/lib/theme';
import type { ViewStyle } from 'react-native';

interface ToastPillProps {
	readonly portalName: string;
	readonly bottomOffset: number;
	readonly percentage: number;
	readonly onExpand: () => void;
	readonly animatedStyle: AnimatedStyle<ViewStyle>;
}

export function ToastPill({
	portalName,
	bottomOffset,
	percentage,
	onExpand,
	animatedStyle,
}: ToastPillProps) {
	const { colors } = useAppTheme();

	return (
		<Portal name={portalName}>
			<View style={[styles.container, { bottom: bottomOffset }]} pointerEvents={'box-none'}>
				<Animated.View style={animatedStyle}>
					<Pressable
						onPress={onExpand}
						style={[styles.pill, { backgroundColor: colors.primaryContainer }]}
					>
						<ActivityIndicator size={'small'} color={colors.onPrimaryContainer} />
						<Text
							variant={'labelMedium'}
							style={[styles.pillText, { color: colors.onPrimaryContainer }]}
						>
							{percentage}%
						</Text>
					</Pressable>
				</Animated.View>
			</View>
		</Portal>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 16,
		right: 16,
		alignItems: 'flex-end',
	},
	pill: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		gap: 8,
		elevation: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
	},
	pillText: {
		fontWeight: '600',
	},
});
