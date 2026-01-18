import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useCurrentTrack } from '@/src/application/state/player-store';
import { FLOATING_PLAYER_HEIGHT } from '@/components/floating-player';

const FLOATING_PLAYER_PADDING = FLOATING_PLAYER_HEIGHT + 16;

const styles = StyleSheet.create({
	playerPadding: {
		paddingBottom: FLOATING_PLAYER_PADDING,
	},
});

export function usePlayerPadding() {
	const currentTrack = useCurrentTrack();
	const hasActiveTrack = currentTrack !== null;

	return useMemo(() => (hasActiveTrack ? styles.playerPadding : undefined), [hasActiveTrack]);
}
