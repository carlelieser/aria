/**
 * DropdownMenu Component
 *
 * M3-compliant menu using React Native Paper.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Menu } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';
import { DropdownMenuContext } from './context';
import type { DropdownMenuProps } from './types';

export { useDropdownMenuContext } from './context';

export function DropdownMenu({ trigger, children, style }: DropdownMenuProps) {
	const [visible, setVisible] = useState(false);
	const { colors } = useAppTheme();

	const openMenu = () => setVisible(true);
	const closeMenu = () => setVisible(false);

	return (
		<DropdownMenuContext.Provider value={{ visible, closeMenu, colors }}>
			<Menu
				visible={visible}
				onDismiss={closeMenu}
				anchor={<View onTouchEnd={openMenu}>{trigger}</View>}
				contentStyle={[styles.menuContent, { backgroundColor: colors.surfaceContainer }]}
				style={style}
			>
				{children}
			</Menu>
		</DropdownMenuContext.Provider>
	);
}

export function DropdownMenuTrigger({ children }: { readonly children: React.ReactNode }) {
	return <>{children}</>;
}

export {
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuGroup,
	DropdownMenuContent,
} from './menu-items';

export type {
	DropdownMenuProps,
	MenuItemProps,
	MenuCheckboxItemProps,
	MenuRadioItemProps,
} from './types';

const styles = StyleSheet.create({
	menuContent: {
		borderRadius: 12,
		minWidth: 180,
	},
});
