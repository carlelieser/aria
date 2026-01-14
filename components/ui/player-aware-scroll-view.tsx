/**
 * PlayerAwareScrollView
 *
 * A ScrollView that automatically adds bottom padding when the floating player
 * is visible, ensuring content can scroll past the player.
 */

import { ScrollView, type ScrollViewProps, StyleSheet } from 'react-native';
import { forwardRef } from 'react';
import { useCurrentTrack } from '@/src/application/state/player-store';
import { FLOATING_PLAYER_HEIGHT } from '@/components/floating-player';

const FLOATING_PLAYER_PADDING = FLOATING_PLAYER_HEIGHT + 48;

export const PlayerAwareScrollView = forwardRef<ScrollView, ScrollViewProps>(
	({ contentContainerStyle, ...props }, ref) => {
		const currentTrack = useCurrentTrack();
		const hasActiveTrack = currentTrack !== null;

		return (
			<ScrollView
				ref={ref}
				contentContainerStyle={[
					contentContainerStyle,
					hasActiveTrack && styles.playerPadding,
				]}
				{...props}
			/>
		);
	}
);

PlayerAwareScrollView.displayName = 'PlayerAwareScrollView';

const styles = StyleSheet.create({
	playerPadding: {
		paddingBottom: FLOATING_PLAYER_PADDING,
	},
});
