/**
 * EmptyState
 *
 * Shared component for displaying empty states with an icon, title, and description.
 * Used across the app for empty lists, no results, and placeholder content.
 */

import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
	/** Icon to display */
	icon: LucideIcon;
	/** Title text */
	title: string;
	/** Optional description text */
	description?: string;
	/** Compact mode for inline contexts */
	compact?: boolean;
}

export function EmptyState({
	icon: IconComponent,
	title,
	description,
	compact = false,
}: EmptyStateProps) {
	const { colors } = useAppTheme();

	if (compact) {
		return (
			<View
				style={[styles.compactContainer, { backgroundColor: colors.surfaceContainerLow }]}
			>
				<Icon as={IconComponent} size={24} color={colors.onSurfaceVariant} />
				<View style={styles.compactTextContainer}>
					<Text
						variant="bodyMedium"
						style={{ color: colors.onSurfaceVariant, fontWeight: '500' }}
					>
						{title}
					</Text>
					{description && (
						<Text variant="bodySmall" style={{ color: colors.outline }}>
							{description}
						</Text>
					)}
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View
				style={[styles.iconContainer, { backgroundColor: colors.surfaceContainerHighest }]}
			>
				<Icon as={IconComponent} size={48} color={colors.onSurfaceVariant} />
			</View>
			<Text
				variant="titleLarge"
				style={{ color: colors.onSurface, marginBottom: 8, fontWeight: '600' }}
			>
				{title}
			</Text>
			{description && (
				<Text
					variant="bodyMedium"
					style={{
						color: colors.onSurfaceVariant,
						textAlign: 'center',
						paddingHorizontal: 32,
					}}
				>
					{description}
				</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 64,
	},
	iconContainer: {
		borderRadius: 9999,
		padding: 24,
		marginBottom: 16,
	},
	compactContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		paddingHorizontal: 16,
		borderRadius: 12,
		gap: 12,
	},
	compactTextContainer: {
		flex: 1,
		gap: 2,
	},
});
