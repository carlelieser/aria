/**
 * FilterChip Component
 *
 * M3-compliant filter chip using React Native Paper.
 */

import { StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { X } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';

interface FilterChipProps {
	label: string;
	selected?: boolean;
	onPress?: () => void;
	onRemove?: () => void;
	showRemoveIcon?: boolean;
	disabled?: boolean;
}

export function FilterChip({
	label,
	selected = false,
	onPress,
	onRemove,
	showRemoveIcon = false,
	disabled = false,
}: FilterChipProps) {
	const { colors } = useAppTheme();

	const handleClose = () => {
		if (showRemoveIcon && onRemove) {
			onRemove();
		}
	};

	return (
		<Chip
			mode={selected ? 'flat' : 'outlined'}
			selected={selected}
			onPress={onPress}
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
}

const styles = StyleSheet.create({
	chip: {
		marginRight: 8,
	},
});
