/**
 * ActiveTimerDisplay Component
 *
 * Shows the active countdown timer or end-of-track status within the sleep timer sheet.
 */

import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { Music2 } from 'lucide-react-native';
import { useAppTheme, M3Shapes } from '@/lib/theme';

interface ActiveTimerDisplayProps {
	readonly isActive: boolean;
	readonly mode: string;
	readonly formatRemaining: () => string;
	readonly onCancel: () => void;
}

export function ActiveTimerDisplay({
	isActive,
	mode,
	formatRemaining,
	onCancel,
}: ActiveTimerDisplayProps) {
	const { colors } = useAppTheme();

	if (isActive) {
		return (
			<View
				style={[styles.activeTimerContainer, { backgroundColor: colors.primaryContainer }]}
			>
				<Text
					variant={'headlineMedium'}
					style={{ color: colors.onPrimaryContainer, fontWeight: '600' }}
				>
					{formatRemaining()}
				</Text>
				<Text variant={'bodyMedium'} style={{ color: colors.onPrimaryContainer }}>
					remaining
				</Text>
				<Button
					mode={'text'}
					textColor={colors.primary}
					onPress={onCancel}
					style={styles.cancelButton}
				>
					Cancel Timer
				</Button>
			</View>
		);
	}

	if (mode === 'end-of-track') {
		return (
			<View
				style={[styles.activeTimerContainer, { backgroundColor: colors.primaryContainer }]}
			>
				<Icon as={Music2} size={32} color={colors.onPrimaryContainer} />
				<Text
					variant={'titleMedium'}
					style={{ color: colors.onPrimaryContainer, marginTop: 8 }}
				>
					Stopping after current track
				</Text>
				<Button
					mode={'text'}
					textColor={colors.primary}
					onPress={onCancel}
					style={styles.cancelButton}
				>
					Cancel
				</Button>
			</View>
		);
	}

	return null;
}

const styles = StyleSheet.create({
	activeTimerContainer: {
		alignItems: 'center',
		padding: 24,
		borderRadius: M3Shapes.large,
		marginBottom: 16,
	},
	cancelButton: {
		marginTop: 12,
	},
});
