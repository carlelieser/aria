/**
 * Tab Configuration
 *
 * Shared tab configuration used by both the tab layout and settings.
 * Separated to avoid circular dependencies and heavy imports.
 */

import {
	MusicIcon,
	SearchIcon,
	DownloadIcon,
	SettingsIcon,
	type LucideIcon,
} from 'lucide-react-native';
import type { TabId } from '@/src/application/state/settings-store';

export interface TabConfig {
	icon: LucideIcon;
	label: string;
	route: string;
}

export const TAB_CONFIG: Record<TabId, TabConfig> = {
	index: { icon: MusicIcon, label: 'Library', route: '/' },
	search: { icon: SearchIcon, label: 'Search', route: '/search' },
	downloads: { icon: DownloadIcon, label: 'Downloads', route: '/downloads' },
	settings: { icon: SettingsIcon, label: 'Settings', route: '/settings' },
};

export const TAB_BAR_HEIGHT = 75;
