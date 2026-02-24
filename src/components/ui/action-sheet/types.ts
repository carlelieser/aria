/**
 * ActionSheet Types
 *
 * Shared types for the action sheet component and its consumers.
 */

import type React from 'react';
import type { LucideIcon } from 'lucide-react-native';

export interface ActionSheetItem {
	readonly id: string;
	readonly label: string;
	readonly icon?: LucideIcon;
	readonly variant?: 'default' | 'destructive';
	readonly disabled?: boolean;
	readonly checked?: boolean;
}

export interface ActionSheetGroup {
	readonly items: readonly ActionSheetItem[];
}

export interface ActionSheetProps {
	readonly isOpen: boolean;
	readonly groups: readonly ActionSheetGroup[];
	readonly onSelect: (itemId: string) => void;
	readonly onClose: () => void;
	readonly header?: React.ReactNode;
	readonly portalName: string;
}
