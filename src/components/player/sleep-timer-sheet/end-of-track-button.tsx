/**
 * EndOfTrackButton Component
 *
 * Option to stop playback at the end of the current track.
 */

import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { Check, Music2 } from 'lucide-react-native';
import { useAppTheme, M3Shapes } from '@/lib/theme';

interface EndOfTrackButtonProps {
	readonly isEndOfTrackMode: boolean;
	readonly onPress: () => void;
}

export function EndOfTrackButton({ isEndOfTrackMode, onPress }: EndOfTrackButtonProps) {
	const { colors } = useAppTheme();

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				{
					backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
				},
			]}
		>
			<View style={styles.content}>
				<Icon as={Music2} size={22} color={colors.onSurfaceVariant} />
				<View style={styles.textContainer}>
					<Text variant={'bodyLarge'} style={{ color: colors.onSurface }}>
						End of current track
					</Text>
					<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
						Stop playback when this track ends
					</Text>
				</View>
				{isEndOfTrackMode && <Icon as={Check} size={20} color={colors.primary} />}
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		borderRadius: M3Shapes.medium,
		marginHorizontal: -8,
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		paddingVertical: 14,
		paddingHorizontal: 16,
	},
	textContainer: {
		flex: 1,
		gap: 2,
	},
});
