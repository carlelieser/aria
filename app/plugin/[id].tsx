/**
 * PluginDetailScreen
 *
 * Display plugin details with enable/disable functionality.
 * Uses file-based routing with plugin ID as parameter.
 */

import { useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text, Switch } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { PageLayout } from '@/components/page-layout';
import { EmptyState } from '@/components/empty-state';
import { SettingsSection } from '@/components/settings/settings-section';
import { PluginSettingsSection } from '@/components/plugin/plugin-settings-section';
import { PuzzleIcon, LockIcon } from 'lucide-react-native';
import { togglePluginRuntime } from '@/src/application/services/plugin-lifecycle-service';
import { useAppTheme } from '@/lib/theme';
import {
	categoryIcons,
	categoryLabels,
	usePluginDisplayStatus,
	usePluginById,
} from '@/hooks/use-plugin-display';

export default function PluginDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { colors } = useAppTheme();
	const plugin = usePluginById(id);
	const { isEnabled, statusInfo, StatusIcon, statusColor } = usePluginDisplayStatus(plugin);

	const handleToggle = useCallback(() => {
		if (plugin && !plugin.isRequired) {
			togglePluginRuntime(plugin.id);
		}
	}, [plugin]);

	if (!plugin) {
		return (
			<PageLayout header={{ title: 'Plugin', showBack: true, compact: true }}>
				<EmptyState
					icon={PuzzleIcon}
					title="Plugin not found"
					description="This plugin may have been removed"
				/>
			</PageLayout>
		);
	}

	const headerRightActions = (
		<Switch value={isEnabled} onValueChange={handleToggle} disabled={plugin.isRequired} />
	);

	return (
		<PageLayout
			header={{
				title: plugin.name,
				showBack: true,
				compact: true,
				rightActions: headerRightActions,
			}}
		>
			<ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
				<View style={styles.detailHeader}>
					<View
						style={[
							styles.detailIcon,
							{ backgroundColor: colors.surfaceContainerHighest },
						]}
					>
						<Icon
							as={categoryIcons[plugin.category] || PuzzleIcon}
							size={40}
							color={colors.onSurface}
						/>
					</View>
					<Text
						variant="headlineSmall"
						style={[styles.detailTitle, { color: colors.onSurface }]}
					>
						{plugin.name}
					</Text>
					<Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
						Version {plugin.version}
					</Text>
					<View style={styles.detailStatusRow}>
						<Icon as={StatusIcon} size={16} color={statusColor} />
						<Text variant="bodySmall" style={{ color: statusColor }}>
							{isEnabled && !plugin.isLoaded
								? 'Restart app to load'
								: statusInfo.label}
						</Text>
					</View>
					{plugin.isRequired && (
						<View
							style={[
								styles.requiredBadge,
								{ backgroundColor: colors.surfaceContainerHighest },
							]}
						>
							<Icon as={LockIcon} size={12} color={colors.onSurfaceVariant} />
							<Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
								Required plugin
							</Text>
						</View>
					)}
				</View>

				{plugin.description && (
					<SettingsSection title="Description">
						<View style={styles.detailCard}>
							<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
								{plugin.description}
							</Text>
						</View>
					</SettingsSection>
				)}

				<SettingsSection title="Category">
					<View style={styles.detailCard}>
						<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
							{categoryLabels[plugin.category] || plugin.category}
						</Text>
					</View>
				</SettingsSection>

				{plugin.requiresAuth && (
					<SettingsSection title="Authentication">
						<View style={styles.detailCard}>
							<View style={styles.authRow}>
								<Icon as={LockIcon} size={16} color={colors.onSurfaceVariant} />
								<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
									This plugin requires authentication to use
								</Text>
							</View>
						</View>
					</SettingsSection>
				)}

				{plugin.capabilities.length > 0 && (
					<SettingsSection title="Capabilities">
						<View style={styles.detailCard}>
							<View style={styles.capabilitiesContainer}>
								{plugin.capabilities.map((cap) => (
									<View
										key={cap}
										style={[
											styles.capabilityChip,
											{ backgroundColor: colors.surfaceContainerHighest },
										]}
									>
										<Text
											variant="labelSmall"
											style={{ color: colors.onSurface }}
										>
											{cap.replace(/-/g, ' ')}
										</Text>
									</View>
								))}
							</View>
						</View>
					</SettingsSection>
				)}

				<PluginSettingsSection pluginId={plugin.id} />
			</ScrollView>
		</PageLayout>
	);
}

const styles = StyleSheet.create({
	scrollView: {
		flex: 1,
		paddingHorizontal: 8,
	},
	scrollContent: {
		paddingBottom: 32,
	},
	detailHeader: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	detailIcon: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	detailTitle: {
		fontWeight: '700',
	},
	detailStatusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 8,
	},
	requiredBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 9999,
		marginTop: 12,
	},
	detailCard: {
		padding: 16,
	},
	authRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	capabilitiesContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	capabilityChip: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 9999,
	},
});
