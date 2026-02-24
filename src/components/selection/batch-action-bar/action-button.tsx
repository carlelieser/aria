/**
 * ActionButton Component
 *
 * Individual batch action button with icon and label.
 */

import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { ActionButtonProps } from './types';

export function ActionButton({ icon, label, onPress, disabled, destructive }: ActionButtonProps) {
	const { colors } = useAppTheme();

	const iconColor = disabled
		? colors.onSurfaceVariant
		: destructive
			? colors.error
			: colors.onSurface;

	const textColor = disabled
		? colors.onSurfaceVariant
		: destructive
			? colors.error
			: colors.onSurface;

	return (
		<Pressable
			style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
			onPress={onPress}
			disabled={disabled}
		>
			<Icon as={icon} size={20} color={iconColor} />
			<Text variant={'labelSmall'} style={{ color: textColor }}>
				{label}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	actionButton: {
		alignItems: 'center',
		gap: 4,
		paddingVertical: 8,
		paddingHorizontal: 16,
	},
	actionButtonDisabled: {
		opacity: 0.5,
	},
});
