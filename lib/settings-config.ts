import {
	HomeIcon,
	MusicIcon,
	SearchIcon,
	DownloadIcon,
	ListMusicIcon,
	UsersIcon,
	DiscIcon,
	MonitorSmartphoneIcon,
	SunIcon,
	MoonIcon,
	type LucideIcon,
} from 'lucide-react-native';
import type {
	ThemePreference,
	DefaultTab,
	LibraryTabId,
} from '@/src/application/state/settings-store';

export const THEME_OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
	{ value: 'system', label: 'System', icon: MonitorSmartphoneIcon },
	{ value: 'light', label: 'Light', icon: SunIcon },
	{ value: 'dark', label: 'Dark', icon: MoonIcon },
];

export const DEFAULT_TAB_OPTIONS: { value: DefaultTab; label: string; icon: LucideIcon }[] = [
	{ value: 'home', label: 'Home', icon: HomeIcon },
	{ value: 'library', label: 'Library', icon: MusicIcon },
	{ value: 'search', label: 'Search', icon: SearchIcon },
	{ value: 'downloads', label: 'Downloads', icon: DownloadIcon },
];

export const LIBRARY_TAB_OPTIONS: { value: LibraryTabId; label: string; icon: LucideIcon }[] = [
	{ value: 'songs', label: 'Songs', icon: MusicIcon },
	{ value: 'playlists', label: 'Playlists', icon: ListMusicIcon },
	{ value: 'artists', label: 'Artists', icon: UsersIcon },
	{ value: 'albums', label: 'Albums', icon: DiscIcon },
];

export const TAB_INDEX_MAP: Record<LibraryTabId, number> = {
	songs: 0,
	artists: 1,
	albums: 2,
	playlists: 3,
};
