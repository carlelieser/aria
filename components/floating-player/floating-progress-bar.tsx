/**
 * FloatingProgressBar Component
 *
 * Thin progress bar for the floating mini player.
 * Uses M3 theming.
 */

import { StyleSheet } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { usePlaybackProgress } from '@/src/application/state/player-store';
import { useAppTheme } from '@/lib/theme';

export function FloatingProgressBar() {
	const { percentage } = usePlaybackProgress();
	const { colors } = useAppTheme();

	return (
		<ProgressBar
			progress={percentage / 100}
			color={colors.primary}
			style={styles.progressBar}
		/>
	);
}

const styles = StyleSheet.create({
	progressBar: {
		height: 3,
		borderRadius: 1.5,
	},
});
