/**
 * PlayerAwareScrollView
 *
 * A ScrollView that automatically adds bottom padding when the floating player
 * is visible, ensuring content can scroll past the player.
 */

import { ScrollView, type ScrollViewProps, StyleSheet, View } from 'react-native';
import { forwardRef } from 'react';
import { useCurrentTrack } from '@/src/application/state/player-store';
import { FLOATING_PLAYER_HEIGHT } from '@/components/floating-player';

const FLOATING_PLAYER_PADDING = FLOATING_PLAYER_HEIGHT + 48;

export const PlayerAwareScrollView = forwardRef<ScrollView, ScrollViewProps>(
	({ contentContainerStyle, style, ...props }, ref) => {
		const currentTrack = useCurrentTrack();
		const hasActiveTrack = currentTrack !== null;

		return (
			<View style={styles.container}>
				<ScrollView
					ref={ref}
					style={[style]}
					contentContainerStyle={[
						contentContainerStyle,
						hasActiveTrack && styles.playerPadding,
					]}
					{...props}
				/>
			</View>
		);
	}
);

PlayerAwareScrollView.displayName = 'PlayerAwareScrollView';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		overflow: 'hidden',
	},
	playerPadding: {
		paddingBottom: FLOATING_PLAYER_PADDING,
	},
});
