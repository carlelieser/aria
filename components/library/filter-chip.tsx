/**
 * FilterChip Component
 *
 * M3-compliant filter chip using React Native Paper.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { X } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';

interface FilterChipProps {
	id?: string;
	label: string;
	selected?: boolean;
	onPress?: () => void;
	onToggle?: (id: string) => void;
	onRemove?: () => void;
	showRemoveIcon?: boolean;
	disabled?: boolean;
}

export const FilterChip = memo(function FilterChip({
	id,
	label,
	selected = false,
	onPress,
	onToggle,
	onRemove,
	showRemoveIcon = false,
	disabled = false,
}: FilterChipProps) {
	const { colors } = useAppTheme();

	const handlePress = useCallback(() => {
		if (onToggle && id) {
			onToggle(id);
		} else if (onPress) {
			onPress();
		}
	}, [onToggle, onPress, id]);

	const handleClose = useCallback(() => {
		if (showRemoveIcon && onRemove) {
			onRemove();
		}
	}, [showRemoveIcon, onRemove]);

	return (
		<Chip
			mode={selected ? 'flat' : 'outlined'}
			selected={selected}
			onPress={handlePress}
			onClose={showRemoveIcon && onRemove ? handleClose : undefined}
			closeIcon={
				showRemoveIcon
					? () => (
							<Icon
								as={X}
								size={16}
								color={
									selected ? colors.onSecondaryContainer : colors.onSurfaceVariant
								}
							/>
						)
					: undefined
			}
			showSelectedCheck={!showRemoveIcon}
			disabled={disabled}
			style={[styles.chip, selected && { backgroundColor: colors.secondaryContainer }]}
			textStyle={{
				color: selected ? colors.onSecondaryContainer : colors.onSurfaceVariant,
			}}
		>
			{label}
		</Chip>
	);
});

const styles = StyleSheet.create({
	chip: {
		marginRight: 8,
		alignItems: 'center'
	},
});
