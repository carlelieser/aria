/**
 * DropdownMenu Types
 *
 * Props interfaces for the dropdown menu component family.
 */

import type React from 'react';
import type { ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { useAppTheme } from '@/lib/theme';

export interface MenuItemProps {
	/** Item title */
	readonly title: string;
	/** Optional leading icon */
	readonly leadingIcon?: LucideIcon;
	/** Optional trailing icon */
	readonly trailingIcon?: LucideIcon;
	/** Press handler */
	readonly onPress?: () => void;
	/** Disabled state */
	readonly disabled?: boolean;
	/** Destructive variant */
	readonly variant?: 'default' | 'destructive';
}

export interface MenuCheckboxItemProps extends Omit<MenuItemProps, 'trailingIcon'> {
	/** Checked state */
	readonly checked: boolean;
	/** Change handler */
	readonly onCheckedChange?: (checked: boolean) => void;
}

export interface MenuRadioItemProps extends Omit<MenuItemProps, 'trailingIcon'> {
	/** Selected state */
	readonly selected: boolean;
}

export interface DropdownMenuProps {
	/** The trigger element that opens the menu */
	readonly trigger: React.ReactNode;
	/** Menu items */
	readonly children: React.ReactNode;
	/** Anchor position */
	readonly anchor?: { readonly x: number; readonly y: number };
	/** Container style */
	readonly style?: ViewStyle;
}

export interface DropdownMenuContextValue {
	readonly visible: boolean;
	readonly closeMenu: () => void;
	readonly colors: ReturnType<typeof useAppTheme>['colors'];
}
