/**
 * Notification Click Handler
 *
 * This route handles deep links from the media notification.
 * When the user clicks on the OS media notification, the app receives
 * an "aria://notification.click" deep link which maps to this route.
 *
 * The handler redirects to the player screen if there's an active track,
 * otherwise redirects to the home screen. Checks the navigation stack
 * to prevent duplicate player screens when resuming from background.
 */

import { Redirect, useRootNavigationState } from 'expo-router';
import { usePlayer } from '@/hooks/use-player';

export default function NotificationClickHandler() {
	const { currentTrack } = usePlayer();
	const navState = useRootNavigationState();

	if (!currentTrack) {
		return <Redirect href="/" />;
	}

	const routes = navState?.routes ?? [];
	const playerInStack = routes.some((r) => r.name === 'player');

	if (playerInStack) {
		return null;
	}

	return <Redirect href="/player" />;
}
