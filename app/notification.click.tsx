/**
 * Notification Click Handler
 *
 * This route handles deep links from the media notification.
 * When the user clicks on the OS media notification, the app receives
 * an "aria://notification.click" deep link which maps to this route.
 *
 * The handler navigates to the player screen if there's an active track,
 * otherwise navigates to the home screen. Uses dismissTo when player is
 * already in the stack to avoid duplicate screens.
 */

import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { usePlayer } from '@/hooks/use-player';

export default function NotificationClickHandler() {
	const { currentTrack } = usePlayer();
	const navigationState = useRootNavigationState();

	useEffect(() => {
		// Wait for navigation state to be ready
		if (!navigationState?.key) return;

		const playerInStack = navigationState.routes?.some(
			(r: { name: string }) => r.name === 'player'
		);

		if (currentTrack) {
			if (playerInStack) {
				// Player already exists in stack - dismiss back to it
				router.dismissTo('/player');
			} else {
				// No player in stack - replace notification.click with player
				router.replace('/player');
			}
		} else {
			router.replace('/');
		}
	}, [currentTrack, navigationState]);

	return null;
}
