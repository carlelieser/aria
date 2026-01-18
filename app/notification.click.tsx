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
