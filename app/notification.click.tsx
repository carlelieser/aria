/**
 * Notification Click Handler
 *
 * This route handles deep links from the media notification.
 * When the user clicks on the OS media notification, the app receives
 * an "aria://notification.click" deep link which maps to this route.
 *
 * The handler redirects to the player screen if there's an active track,
 * otherwise redirects to the home screen.
 */

import { Redirect } from 'expo-router';
import { usePlayer } from '@/hooks/use-player';

export default function NotificationClickHandler() {
	const { currentTrack } = usePlayer();

	// If there's a track playing, go to the player screen
	// Otherwise, go to the home screen
	if (currentTrack) {
		return <Redirect href="/player" />;
	}

	return <Redirect href="/" />;
}
