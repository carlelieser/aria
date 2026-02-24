/**
 * QueueHeader Component
 *
 * Header row for the queue sheet with title and clear action.
 */

import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';
import type { QueueHeaderProps } from './types';

export function QueueHeader({ trackCount, onClear }: QueueHeaderProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.container}>
			<Text variant={'titleMedium'} style={{ color: colors.onSurface }}>
				Queue
			</Text>
			{trackCount > 0 && (
				<TouchableOpacity onPress={onClear} hitSlop={8}>
					<Text variant={'labelLarge'} style={{ color: colors.error }}>
						Clear
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 16,
	},
});
