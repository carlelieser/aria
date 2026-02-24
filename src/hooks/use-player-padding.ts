import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useCurrentTrack } from '@/src/application/state/player-store';
import { FLOATING_PLAYER_HEIGHT } from '@shared/constants/layout';

const FLOATING_PLAYER_PADDING = FLOATING_PLAYER_HEIGHT + 80;

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
