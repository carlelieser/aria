import { HomeIcon, MusicIcon, DownloadIcon, SearchIcon, SettingsIcon, type LucideIcon } from 'lucide-react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { AnimationObject } from 'lottie-react-native';
import type { TabId } from '@/src/application/state/settings-store';

import HomeLottie from '@/assets/animation/system-solid-41-home-hover-pinch.json';
import LibraryLottie from '@/assets/animation/system-regular-106-headphones-hover-hearphones.json';
import DownloadsLottie from '@/assets/animation/system-regular-81-download-save-hover-pinch.json';
import SearchLottie from '@/assets/animation/system-solid-42-search-hover-pinch.json';
import SettingsLottie from '@/assets/animation/system-regular-63-settings-cog-hover-cog-1.json';

export type TabConfig = BottomTabNavigationOptions & {
	readonly icon: LucideIcon;
	readonly lottieSource?: AnimationObject;
	readonly route: string;
};

export const TAB_CONFIG: Record<TabId, TabConfig> = {
	home: {
		title: 'Home',
		icon: HomeIcon,
		lottieSource: HomeLottie,
		route: '/home',
	},
	index: {
		title: 'Library',
		icon: MusicIcon,
		lottieSource: LibraryLottie,
		route: '/',
	},
	downloads: {
		title: 'Downloads',
		icon: DownloadIcon,
		lottieSource: DownloadsLottie,
		route: '/downloads',
	},
	search: {
		title: 'Search',
		icon: SearchIcon,
		lottieSource: SearchLottie,
		route: '/search',
	},
	settings: {
		title: 'Settings',
		icon: SettingsIcon,
		lottieSource: SettingsLottie,
		route: '/settings',
	},
};

export const TAB_ROUTES = Object.values(TAB_CONFIG).map((c) => c.route);

export const TAB_BAR_HEIGHT = 75;
