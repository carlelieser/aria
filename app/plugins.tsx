/**
 * PluginsScreen
 *
 * Manage plugins for music sources and features.
 * Shows all available plugins from the manifest registry,
 * with enable/disable functionality.
 */

import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, Switch } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { PageLayout } from '@/components/page-layout';
import { EmptyState } from '@/components/empty-state';
import { SettingsSection } from '@/components/settings/settings-section';
import {
	ChevronRightIcon,
	CheckCircleIcon,
	XCircleIcon,
	AlertCircleIcon,
	LoaderIcon,
	MusicIcon,
	PlayCircleIcon,
	CloudIcon,
	PuzzleIcon,
	LockIcon,
	LibraryBigIcon,
	type LucideIcon,
} from 'lucide-react-native';
import { PluginRegistry } from '@/src/plugins/core/registry/plugin-registry';
import { PluginManifestRegistry } from '@/src/plugins/core/registry/plugin-manifest-registry';
import type { PluginStatus, PluginCategory } from '@/src/plugins/core/interfaces/base-plugin';
import {
	useEnabledPlugins,
	useTogglePlugin,
	REQUIRED_PLUGINS,
} from '@/src/application/state/plugin-settings-store';
import { PluginListSkeleton } from '@/components/skeletons';
import { useAppTheme } from '@/lib/theme';

interface PluginDisplayInfo {
	id: string;
	name: string;
	version: string;
	description?: string;
	category: PluginCategory;
	status: PluginStatus;
	isEnabled: boolean;
	isLoaded: boolean;
	isRequired: boolean;
	capabilities: string[];
	requiresAuth?: boolean;
}

const categoryIcons: Record<PluginCategory, LucideIcon> = {
	'metadata-provider': MusicIcon,
	'audio-source-provider': MusicIcon,
	'playback-provider': PlayCircleIcon,
	'sync-provider': CloudIcon,
	'lyrics-provider': MusicIcon,
	recommendation: MusicIcon,
	visualizer: MusicIcon,
	'actions-provider': LibraryBigIcon,
};

const categoryLabels: Record<PluginCategory, string> = {
	'metadata-provider': 'Music Sources',
	'audio-source-provider': 'Audio Sources',
	'playback-provider': 'Playback',
	'sync-provider': 'Sync & Backup',
	'lyrics-provider': 'Lyrics',
	recommendation: 'Recommendations',
	visualizer: 'Visualizer',
	'actions-provider': 'Actions',
};

const statusConfig: Record<
	PluginStatus,
	{
		icon: LucideIcon;
		colorKey: 'onSurfaceVariant' | 'primary' | 'error' | 'tertiary';
		label: string;
	}
> = {
	uninitialized: {
		icon: AlertCircleIcon,
		colorKey: 'onSurfaceVariant',
		label: 'Not loaded',
	},
	initializing: { icon: LoaderIcon, colorKey: 'tertiary', label: 'Loading...' },
	ready: { icon: CheckCircleIcon, colorKey: 'onSurfaceVariant', label: 'Ready' },
	active: { icon: CheckCircleIcon, colorKey: 'primary', label: 'Active' },
	error: { icon: XCircleIcon, colorKey: 'error', label: 'Error' },
	disabled: { icon: XCircleIcon, colorKey: 'onSurfaceVariant', label: 'Disabled' },
};

export default function PluginsScreen() {
	const [plugins, setPlugins] = useState<PluginDisplayInfo[]>([]);
	const [selectedPlugin, setSelectedPlugin] = useState<PluginDisplayInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const enabledPlugins = useEnabledPlugins();
	const togglePlugin = useTogglePlugin();

	const loadPlugins = useCallback(() => {
		const manifestRegistry = PluginManifestRegistry.getInstance();
		const pluginRegistry = PluginRegistry.getInstance();
		const enabledSet = new Set(enabledPlugins);

		const availableManifests = manifestRegistry.getAvailablePlugins();

		const pluginInfos: PluginDisplayInfo[] = availableManifests.map((manifest) => {
			const loadedPlugin = pluginRegistry.getPlugin(manifest.id);
			const isLoaded = !!loadedPlugin;
			const isEnabled = enabledSet.has(manifest.id);
			const isRequired = REQUIRED_PLUGINS.includes(manifest.id);

			return {
				id: manifest.id,
				name: manifest.name,
				version: manifest.version,
				description: manifest.description,
				category: manifest.category,
				status: loadedPlugin
					? (pluginRegistry.getStatus(manifest.id) ?? 'uninitialized')
					: 'uninitialized',
				isEnabled,
				isLoaded,
				isRequired,
				capabilities: manifest.capabilities || [],
				requiresAuth: manifest.capabilitiesDetail?.requiresAuth,
			};
		});

		setPlugins(pluginInfos);
		setIsLoading(false);
	}, [enabledPlugins]);

	useEffect(() => {
		loadPlugins();

		const registry = PluginRegistry.getInstance();
		const unsubscribe = registry.on(() => {
			loadPlugins();
		});

		return unsubscribe;
	}, [loadPlugins]);

	const handleTogglePlugin = useCallback(
		(plugin: PluginDisplayInfo) => {
			if (plugin.isRequired) {
				return;
			}
			togglePlugin(plugin.id);
		},
		[togglePlugin]
	);

	const pluginsByCategory = useMemo(() => {
		return plugins.reduce(
			(acc, plugin) => {
				if (!acc[plugin.category]) {
					acc[plugin.category] = [];
				}
				acc[plugin.category].push(plugin);
				return acc;
			},
			{} as Record<PluginCategory, PluginDisplayInfo[]>
		);
	}, [plugins]);

	if (selectedPlugin) {
		return (
			<PluginDetailScreen
				plugin={selectedPlugin}
				onBack={() => setSelectedPlugin(null)}
				onToggle={() => handleTogglePlugin(selectedPlugin)}
			/>
		);
	}

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
									onPress={() => setSelectedPlugin(plugin)}
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

	let displayStatus: PluginStatus;
	if (!plugin.isEnabled) {
		displayStatus = 'disabled';
	} else if (plugin.isLoaded) {
		displayStatus = plugin.status;
	} else {
		displayStatus = 'uninitialized';
	}

	const statusInfo = statusConfig[displayStatus];
	const StatusIcon = statusInfo.icon;
	const statusColor = colors[statusInfo.colorKey];
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
						{plugin.isEnabled && !plugin.isLoaded
							? 'Restart to load'
							: statusInfo.label}
					</Text>
				</View>
			</View>

			<View style={styles.actions}>
				<Switch
					value={plugin.isEnabled}
					onValueChange={onToggle}
					disabled={plugin.isRequired}
				/>
				<Icon as={ChevronRightIcon} size={20} color={colors.onSurfaceVariant} />
			</View>
		</Pressable>
	);
}

function PluginDetailScreen({
	plugin,
	onBack,
	onToggle,
}: {
	plugin: PluginDisplayInfo;
	onBack: () => void;
	onToggle: () => void;
}) {
	const { colors } = useAppTheme();

	let displayStatus: PluginStatus;
	if (!plugin.isEnabled) {
		displayStatus = 'disabled';
	} else if (plugin.isLoaded) {
		displayStatus = plugin.status;
	} else {
		displayStatus = 'uninitialized';
	}

	const statusInfo = statusConfig[displayStatus];
	const StatusIcon = statusInfo.icon;
	const statusColor = colors[statusInfo.colorKey];

	const headerRightActions = (
		<Switch value={plugin.isEnabled} onValueChange={onToggle} disabled={plugin.isRequired} />
	);

	return (
		<PageLayout
			header={{
				title: plugin.name,
				showBack: true,
				onBack,
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
							{plugin.isEnabled && !plugin.isLoaded
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
