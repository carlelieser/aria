/**
 * TabItemRow Component
 *
 * A single row in the tab reorder list with toggle, icon, label, and move buttons.
 */

import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react-native';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { TabItemRowProps } from './types';

export function TabItemRow({
	tabId,
	title,
	icon: TabIcon,
	index,
	isFirst,
	isLast,
	isEnabled,
	isRequired,
	onMoveUp,
	onMoveDown,
	onToggle,
}: TabItemRowProps) {
	const { colors } = useAppTheme();

	return (
		<View
			style={[
				styles.tabItem,
				{ backgroundColor: colors.surfaceContainerHighest },
				!isEnabled && styles.disabledTab,
			]}
		>
			<View style={styles.tabInfo}>
				<TabIcon size={20} color={isEnabled ? colors.onSurface : colors.outlineVariant} />
				<Text
					variant={'bodyMedium'}
					style={[
						styles.tabLabel,
						{
							color: isEnabled ? colors.onSurface : colors.outlineVariant,
						},
					]}
				>
					{title}
				</Text>
			</View>
			<View style={styles.tabActions}>
				<Switch
					value={isEnabled}
					onValueChange={() => onToggle(tabId)}
					disabled={isRequired}
					style={styles.switch}
				/>
				<Pressable
					onPress={() => onMoveUp(index)}
					disabled={isFirst}
					style={({ pressed }) => [
						styles.arrowButton,
						{ backgroundColor: colors.surfaceContainer },
						pressed && !isFirst && styles.pressed,
						isFirst && styles.disabledButton,
					]}
				>
					<ChevronUpIcon
						size={18}
						color={isFirst ? colors.outlineVariant : colors.onSurface}
					/>
				</Pressable>
				<Pressable
					onPress={() => onMoveDown(index)}
					disabled={isLast}
					style={({ pressed }) => [
						styles.arrowButton,
						{ backgroundColor: colors.surfaceContainer },
						pressed && !isLast && styles.pressed,
						isLast && styles.disabledButton,
					]}
				>
					<ChevronDownIcon
						size={18}
						color={isLast ? colors.outlineVariant : colors.onSurface}
					/>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	pressed: {
		opacity: 0.7,
	},
	tabItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: M3Shapes.medium,
	},
	tabInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	tabLabel: {
		fontWeight: '500',
	},
	tabActions: {
		flexDirection: 'row',
		gap: 8,
	},
	arrowButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	disabledButton: {
		opacity: 0.5,
	},
	disabledTab: {
		opacity: 0.6,
	},
	switch: {
		marginRight: 4,
	},
});
