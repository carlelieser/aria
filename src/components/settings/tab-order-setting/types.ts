/**
 * TabOrderSetting Types
 *
 * Props and type definitions for the tab order setting component.
 */

import type { LucideIcon } from 'lucide-react-native';
import type { TabId } from '@/src/application/state/settings-store';

export interface TabItemRowProps {
	readonly tabId: TabId;
	readonly title: string;
	readonly icon: LucideIcon;
	readonly index: number;
	readonly isFirst: boolean;
	readonly isLast: boolean;
	readonly isEnabled: boolean;
	readonly isRequired: boolean;
	readonly onMoveUp: (index: number) => void;
	readonly onMoveDown: (index: number) => void;
	readonly onToggle: (tabId: TabId) => void;
}
