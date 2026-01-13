/**
 * Notification Click Handler
 *
 * This route handles deep links from the media notification.
 * When the user clicks on the OS media notification, the app receives
 * an "aria://notification.click" deep link which maps to this route.
 *
 * The handler redirects to the player screen if there's an active track,
 * otherwise redirects to the home screen. Uses withAnchor to prevent
 * duplicate player screens in the navigation stack.
 */

import { Redirect, usePathname } from 'expo-router';
import { usePlayer } from '@/hooks/use-player';

export default function NotificationClickHandler() {
	const pathname = usePathname();
	const { currentTrack } = usePlayer();

	// If there's a track playing, go to the player screen (if not already on the player screen)
	// Otherwise, go to the home screen
	if (currentTrack) {
		if (pathname === '/player') {
			return null;
		}
		return <Redirect href="/player" withAnchor={true} />;
	}

	return <Redirect href="/" />;
}
