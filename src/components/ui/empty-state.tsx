/**
 * EmptyState
 *
 * Shared component for displaying empty states with an icon, title, and description.
 * Used across the app for empty lists, no results, and placeholder content.
 */

import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
	/** Icon to display */
	readonly icon: LucideIcon;
	/** Title text */
	readonly title: string;
	/** Optional description text */
	readonly description?: string;
	/** Optional action element rendered below the description */
	readonly action?: ReactNode;
}

export function EmptyState({ icon: IconComponent, title, description, action }: EmptyStateProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.container}>
			<View
				style={[styles.iconContainer, { backgroundColor: colors.surfaceContainerHighest }]}
			>
				<Icon as={IconComponent} size={48} color={colors.onSurfaceVariant} />
			</View>
			<Text
				variant={'titleLarge'}
				style={{
					color: colors.onSurface,
					marginBottom: 8,
					fontWeight: '600',
					textAlign: 'center',
				}}
			>
				{title}
			</Text>
			{description && (
				<Text
					variant={'bodyMedium'}
					style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}
				>
					{description}
				</Text>
			)}
			{action}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		paddingVertical: 64,
		paddingHorizontal: 32,
	},
	iconContainer: {
		alignSelf: 'center',
		borderRadius: 9999,
		padding: 24,
		marginBottom: 16,
	},
});
