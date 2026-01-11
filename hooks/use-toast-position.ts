/**
 * Hook for calculating toast bottom offset
 *
 * Accounts for tab bar, floating player, and safe area insets.
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { useCurrentTrack } from '@/src/application/state/player-store';
import { TAB_BAR_HEIGHT } from '@/lib/tab-config';

const FLOATING_PLAYER_HEIGHT = 64;
const FLOATING_PLAYER_MARGIN = 8;
const TOAST_GAP = 8;
const TAB_ROUTES = ['/', '/explore', '/downloads', '/settings'];

export function useToastPosition(): number {
	const insets = useSafeAreaInsets();
	const pathname = usePathname();
	const currentTrack = useCurrentTrack();

	const isTabRoute = TAB_ROUTES.includes(pathname);
	const isFloatingPlayerVisible = pathname !== '/player' && currentTrack !== null;

	let bottomOffset = TOAST_GAP;

	if (isTabRoute) {
		bottomOffset += TAB_BAR_HEIGHT + insets.bottom;
	} else {
		bottomOffset += insets.bottom;
	}

	if (isFloatingPlayerVisible) {
		bottomOffset += FLOATING_PLAYER_HEIGHT + FLOATING_PLAYER_MARGIN;
	}

	return bottomOffset;
}
