/**
 * Tab Configuration
 *
 * Shared tab configuration used by both the tab layout and settings.
 * Separated to avoid circular dependencies and heavy imports.
 */

import { MusicIcon, CompassIcon, DownloadIcon, type LucideIcon } from 'lucide-react-native';
import type { TabId } from '@/src/application/state/settings-store';

export interface TabConfig {
	icon: LucideIcon;
	label: string;
	route: string;
}

export const TAB_CONFIG: Record<TabId, TabConfig> = {
	index: { icon: MusicIcon, label: 'Library', route: '/' },
	explore: { icon: CompassIcon, label: 'Explore', route: '/explore' },
	downloads: { icon: DownloadIcon, label: 'Downloads', route: '/downloads' },
};

export const TAB_BAR_HEIGHT = 80;
