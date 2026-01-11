/**
 * PluginsScreen
 *
 * Manage plugins for music sources and features.
 * Shows all available plugins from the manifest registry,
 * with enable/disable functionality.
 */

import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useCallback } from 'react';
import { router, type Href } from 'expo-router';
import { Text, Switch } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { PageLayout } from '@/components/page-layout';
import { EmptyState } from '@/components/empty-state';
import { SettingsSection } from '@/components/settings/settings-section';
import { ChevronRightIcon, PuzzleIcon, LockIcon } from 'lucide-react-native';
import { togglePluginRuntime } from '@/src/application/services/plugin-lifecycle-service';
import { PluginListSkeleton } from '@/components/skeletons';
import { useAppTheme } from '@/lib/theme';
import {
	type PluginDisplayInfo,
	type PluginCategory,
	categoryIcons,
	categoryLabels,
	usePluginDisplayStatus,
	usePluginList,
} from '@/hooks/use-plugin-display';

export default function PluginsScreen() {
	const { plugins, pluginsByCategory, isLoading } = usePluginList();

	const handleTogglePlugin = useCallback((plugin: PluginDisplayInfo) => {
		if (plugin.isRequired) {
			return;
		}
		togglePluginRuntime(plugin.id);
	}, []);

	return (
		<PageLayout header={{ title: 'Plugins', showBack: true, compact: true }}>
			<ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<PluginListSkeleton count={4} />
					</View>
				) : plugins.length === 0 ? (
					<EmptyState
						icon={PuzzleIcon}
						title="No plugins available"
						description="Plugins extend Aria with new music sources, playback features, and more."
					/>
				) : (
					Object.entries(pluginsByCategory).map(([category, categoryPlugins]) => (
						<SettingsSection
							key={category}
							title={categoryLabels[category as PluginCategory] || category}
						>
							{categoryPlugins.map((plugin) => (
								<PluginItem
									key={plugin.id}
									plugin={plugin}
									onPress={() => router.push(`/plugin/${plugin.id}` as Href)}
									onToggle={() => handleTogglePlugin(plugin)}
								/>
							))}
						</SettingsSection>
					))
				)}
			</ScrollView>
		</PageLayout>
	);
}

function PluginItem({
	plugin,
	onPress,
	onToggle,
}: {
	plugin: PluginDisplayInfo;
	onPress: () => void;
	onToggle: () => void;
}) {
	const { colors } = useAppTheme();
	const { isEnabled, statusInfo, StatusIcon, statusColor } = usePluginDisplayStatus(plugin);
	const PluginIcon = categoryIcons[plugin.category] || PuzzleIcon;

	return (
		<Pressable
			style={({ pressed }) => [styles.pluginItem, pressed && styles.pressed]}
			onPress={onPress}
		>
			<View
				style={[styles.iconContainer, { backgroundColor: colors.surfaceContainerHighest }]}
			>
				<Icon as={PluginIcon} size={20} color={colors.onSurface} />
			</View>

			<View style={styles.content}>
				<View style={styles.titleRow}>
					<Text variant="bodyMedium" style={[styles.title, { color: colors.onSurface }]}>
						{plugin.name}
					</Text>
					<Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
						v{plugin.version}
					</Text>
					{plugin.requiresAuth && (
						<Icon as={LockIcon} size={12} color={colors.onSurfaceVariant} />
					)}
				</View>
				<View style={styles.statusRow}>
					<Icon as={StatusIcon} size={12} color={statusColor} />
					<Text variant="labelSmall" style={{ color: statusColor }}>
						{isEnabled && !plugin.isLoaded ? 'Restart to load' : statusInfo.label}
					</Text>
				</View>
			</View>

			<View style={styles.actions}>
				<Switch
					value={isEnabled}
					onValueChange={onToggle}
					disabled={plugin.isRequired}
				/>
				<Icon as={ChevronRightIcon} size={20} color={colors.onSurfaceVariant} />
			</View>
		</Pressable>
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
	loadingContainer: {
		marginTop: 24,
		marginHorizontal: 8,
	},
	pressed: {
		opacity: 0.7,
	},
	pluginItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		paddingVertical: 14,
		paddingHorizontal: 16,
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	content: {
		flex: 1,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	title: {
		fontWeight: '500',
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 2,
	},
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
});
