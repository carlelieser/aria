/**
 * DropdownMenu Item Components
 *
 * Individual menu item variants: standard, checkbox, radio, label, separator, group.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Menu, Divider, Text } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { Check } from 'lucide-react-native';
import type { MenuItemProps, MenuCheckboxItemProps, MenuRadioItemProps } from './types';
import { useDropdownMenuContext } from './context';

export function DropdownMenuItem({
	title,
	leadingIcon,
	trailingIcon,
	onPress,
	disabled = false,
	variant = 'default',
}: MenuItemProps) {
	const { closeMenu, colors } = useDropdownMenuContext();

	const handlePress = () => {
		onPress?.();
		closeMenu();
	};

	const textColor = variant === 'destructive' ? colors.error : colors.onSurface;
	const iconColor = variant === 'destructive' ? colors.error : colors.onSurfaceVariant;

	return (
		<Menu.Item
			onPress={handlePress}
			disabled={disabled}
			title={title}
			titleStyle={{ color: textColor }}
			leadingIcon={
				leadingIcon
					? () => <Icon as={leadingIcon} size={20} color={iconColor} />
					: undefined
			}
			trailingIcon={
				trailingIcon
					? () => <Icon as={trailingIcon} size={20} color={iconColor} />
					: undefined
			}
		/>
	);
}

export function DropdownMenuCheckboxItem({
	title,
	leadingIcon,
	checked,
	onCheckedChange,
	onPress,
	disabled = false,
}: MenuCheckboxItemProps) {
	const { closeMenu, colors } = useDropdownMenuContext();

	const handlePress = () => {
		onCheckedChange?.(!checked);
		onPress?.();
		closeMenu();
	};

	return (
		<Menu.Item
			onPress={handlePress}
			disabled={disabled}
			title={title}
			leadingIcon={
				leadingIcon
					? () => <Icon as={leadingIcon} size={20} color={colors.onSurfaceVariant} />
					: undefined
			}
			trailingIcon={
				checked ? () => <Icon as={Check} size={20} color={colors.primary} /> : undefined
			}
		/>
	);
}

export function DropdownMenuRadioItem({
	title,
	leadingIcon,
	selected,
	onPress,
	disabled = false,
}: MenuRadioItemProps) {
	const { closeMenu, colors } = useDropdownMenuContext();

	const handlePress = () => {
		onPress?.();
		closeMenu();
	};

	return (
		<Menu.Item
			onPress={handlePress}
			disabled={disabled}
			title={title}
			leadingIcon={
				leadingIcon
					? () => <Icon as={leadingIcon} size={20} color={colors.onSurfaceVariant} />
					: undefined
			}
			trailingIcon={
				selected
					? () => (
							<View
								style={[styles.radioIndicator, { backgroundColor: colors.primary }]}
							/>
						)
					: undefined
			}
		/>
	);
}

export function DropdownMenuLabel({ children }: { readonly children: string }) {
	const { colors } = useDropdownMenuContext();

	return (
		<View style={styles.label}>
			<Text variant={'labelMedium'} style={{ color: colors.onSurfaceVariant }}>
				{children}
			</Text>
		</View>
	);
}

export function DropdownMenuSeparator() {
	return <Divider style={styles.separator} />;
}

export function DropdownMenuGroup({ children }: { readonly children: React.ReactNode }) {
	return <>{children}</>;
}

export function DropdownMenuContent({ children }: { readonly children: React.ReactNode }) {
	return <>{children}</>;
}

const styles = StyleSheet.create({
	label: {
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	separator: {
		marginVertical: 4,
	},
	radioIndicator: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
});
