/**
 * MovableItem Component
 *
 * A list row with an optional enable toggle and up/down reorder controls.
 * Generalized from the tab-order setting so any "toggle + reorder a list"
 * surface (tab order, provider priority, …) can share one component.
 */

import { View, StyleSheet } from 'react-native';
import { Text, Switch, IconButton } from 'react-native-paper';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { LucideIcon } from 'lucide-react-native';

interface MovableItemProps {
	readonly label: string;
	readonly icon?: LucideIcon;
	/** When omitted, the toggle is hidden and the row is always shown enabled. */
	readonly enabled?: boolean;
	readonly isFirst: boolean;
	readonly isLast: boolean;
	/** Disables the toggle (e.g. a required item that can't be turned off). */
	readonly toggleDisabled?: boolean;
	readonly onToggle?: () => void;
	readonly onMoveUp: () => void;
	readonly onMoveDown: () => void;
}

export function MovableItem({
	label,
	icon: ItemIcon,
	enabled = true,
	isFirst,
	isLast,
	toggleDisabled = false,
	onToggle,
	onMoveUp,
	onMoveDown,
}: MovableItemProps) {
	const { colors } = useAppTheme();
	const contentColor = enabled ? colors.onSurface : colors.outlineVariant;

	return (
		<View
			style={[
				styles.item,
				{ backgroundColor: colors.surfaceContainerHighest },
				!enabled && styles.disabled,
			]}
		>
			<View style={styles.info}>
				{ItemIcon && <Icon as={ItemIcon} size={20} color={contentColor} />}
				<Text variant={'bodyMedium'} style={[styles.label, { color: contentColor }]}>
					{label}
				</Text>
			</View>
			<View style={styles.actions}>
				{onToggle && (
					<Switch value={enabled} onValueChange={onToggle} disabled={toggleDisabled} />
				)}
				<IconButton
					icon={() => (
						<ChevronUpIcon
							size={18}
							color={isFirst ? colors.outlineVariant : colors.onSurface}
						/>
					)}
					onPress={onMoveUp}
					disabled={isFirst}
					containerColor={colors.surfaceContainer}
					size={18}
					style={styles.arrow}
				/>
				<IconButton
					icon={() => (
						<ChevronDownIcon
							size={18}
							color={isLast ? colors.outlineVariant : colors.onSurface}
						/>
					)}
					onPress={onMoveDown}
					disabled={isLast}
					containerColor={colors.surfaceContainer}
					size={18}
					style={styles.arrow}
				/>
			</View>
		</View>
	);
}

export type { MovableItemProps };

const styles = StyleSheet.create({
	item: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: M3Shapes.medium,
	},
	info: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1,
	},
	label: {
		fontWeight: '500',
	},
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	disabled: {
		opacity: 0.6,
	},
	arrow: {
		margin: 0,
	},
});
