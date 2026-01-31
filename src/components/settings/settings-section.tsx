/**
 * SettingsSection Component
 *
 * A container for grouping related settings items.
 * Uses M3 theming with Surface background.
 */

import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

interface SettingsSectionProps {
	title: string;
	children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.container}>
			<Text variant="labelMedium" style={[styles.title, { color: colors.onSurfaceVariant }]}>
				{title.toUpperCase()}
			</Text>
			<Surface
				elevation={0}
				style={[styles.content, { backgroundColor: colors.surfaceContainerLow }]}
			>
				{children}
			</Surface>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: 24,
	},
	title: {
		paddingHorizontal: 16,
		marginBottom: 8,
		letterSpacing: 0.5,
	},
	content: {
		borderRadius: 16,
		overflow: 'hidden',
	},
});
