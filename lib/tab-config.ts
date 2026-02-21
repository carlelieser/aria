import {
	HomeIcon,
	MusicIcon,
	DownloadIcon,
	SearchIcon,
	type LucideIcon,
} from 'lucide-react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { AnimationObject } from 'lottie-react-native';
import type { TabId } from '@/src/application/state/settings-store';

import HomeLottie from '@/assets/animation/system-solid-41-home-hover-pinch.json';
import LibraryLottie from '@/assets/animation/system-regular-106-headphones-hover-hearphones.json';
import DownloadsLottie from '@/assets/animation/system-regular-81-download-save-hover-pinch.json';
import SearchLottie from '@/assets/animation/system-solid-42-search-hover-pinch.json';

export type TabConfig = BottomTabNavigationOptions & {
	readonly icon: LucideIcon;
	readonly lottieSource?: AnimationObject;
};

export const TAB_CONFIG: Record<TabId, TabConfig> = {
	home: {
		title: 'Home',
		icon: HomeIcon,
		lottieSource: HomeLottie,
	},
	library: {
		title: 'Library',
		icon: MusicIcon,
		lottieSource: LibraryLottie,
	},
	downloads: {
		title: 'Downloads',
		icon: DownloadIcon,
		lottieSource: DownloadsLottie,
	},
	search: {
		title: 'Search',
		icon: SearchIcon,
		lottieSource: SearchLottie,
	},
};

export const TAB_ROUTES = ['/library', '/home', '/downloads', '/search'];

export const TAB_BAR_HEIGHT = 75;
