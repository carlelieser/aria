import { MusicIcon, DownloadIcon, SettingsIcon, type LucideIcon } from 'lucide-react-native';
import type { AnimationObject } from 'lottie-react-native';
import type { TabId } from '@/src/application/state/settings-store';

import LibraryLottie from '@/assets/animation/system-regular-106-headphones-hover-hearphones.json';
import DownloadsLottie from '@/assets/animation/system-regular-81-download-save-hover-pinch.json';
import SettingsLottie from '@/assets/animation/system-regular-63-settings-cog-hover-cog-1.json';

export interface TabConfig {
	readonly icon: LucideIcon;
	readonly lottieSource: AnimationObject;
	readonly label: string;
	readonly route: string;
}

export const TAB_CONFIG: Record<TabId, TabConfig> = {
	index: { icon: MusicIcon, lottieSource: LibraryLottie, label: 'Library', route: '/' },
	downloads: { icon: DownloadIcon, lottieSource: DownloadsLottie, label: 'Downloads', route: '/downloads' },
	settings: { icon: SettingsIcon, lottieSource: SettingsLottie, label: 'Settings', route: '/settings' },
};

export const TAB_BAR_HEIGHT = 75;
