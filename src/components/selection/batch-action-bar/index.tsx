/**
 * BatchActionBar Component
 *
 * Fixed bottom bar shown when items are selected.
 * Provides context-aware batch actions.
 */

import { memo, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { Text, Surface } from 'react-native-paper';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { BatchActionBarProps } from './types';
import { ActionButton } from './action-button';
import { getActionsForContext } from './action-config';

const AnimatedSurface = Animated.createAnimatedComponent(Surface);

export const BatchActionBar = memo(function BatchActionBar(props: BatchActionBarProps) {
	const { context, selectedCount, onCancel, isProcessing = false } = props;
	const { colors } = useAppTheme();
	const actions = useMemo(() => getActionsForContext(context, props), [context, props]);

	if (selectedCount === 0) {
		return null;
	}

	return (
		<AnimatedSurface
			entering={FadeInDown.duration(200)}
			exiting={FadeOutDown.duration(200)}
			elevation={4}
			mode={'flat'}
			style={[styles.container]}
		>
			<View style={styles.header}>
				<Pressable style={styles.cancelButton} onPress={onCancel} hitSlop={8}>
					<Icon as={X} size={20} color={colors.onSurfaceVariant} />
				</Pressable>
				<Text variant={'titleSmall'} style={{ color: colors.onSurface }}>
					{selectedCount} selected
				</Text>
			</View>

			<PlayerAwareScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.scrollView}
				contentContainerStyle={styles.actions}
			>
				{actions.map(
					(action) =>
						action.handler && (
							<ActionButton
								key={action.label}
								icon={action.icon}
								label={action.label}
								onPress={action.handler}
								disabled={isProcessing}
								destructive={action.destructive}
							/>
						)
				)}
			</PlayerAwareScrollView>
		</AnimatedSurface>
	);
});

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingTop: 12,
		paddingHorizontal: 16,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
	},
	scrollView: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 16,
	},
	cancelButton: {
		padding: 4,
	},
	actions: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		flexGrow: 1,
	},
});

export type { BatchActionContext, BatchActionBarProps } from './types';
