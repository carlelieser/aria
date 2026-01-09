import { View, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { getLogger } from '@/src/shared/services/logger';
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	CheckCircleIcon,
	XCircleIcon,
	AlertCircleIcon,
	LoaderIcon,
	MusicIcon,
	PlayCircleIcon,
	CloudIcon,
	PuzzleIcon,
	type LucideIcon,
} from 'lucide-react-native';
import { PluginRegistry } from '@/src/plugins/core/registry/plugin-registry';
import type {
	BasePlugin,
	PluginStatus,
	PluginCategory,
} from '@/src/plugins/core/interfaces/base-plugin';
import { PluginListSkeleton } from '@/components/skeletons';

const logger = getLogger('Plugins');

interface PluginDisplayInfo {
	id: string;
	name: string;
	version: string;
	description?: string;
	category: PluginCategory;
	status: PluginStatus;
	isActive: boolean;
	capabilities: string[];
}

const categoryIcons: Record<PluginCategory, LucideIcon> = {
	'metadata-provider': MusicIcon,
	'audio-source-provider': MusicIcon,
	'playback-provider': PlayCircleIcon,
	'sync-provider': CloudIcon,
	'lyrics-provider': MusicIcon,
	recommendation: MusicIcon,
	visualizer: MusicIcon,
};

const categoryLabels: Record<PluginCategory, string> = {
	'metadata-provider': 'Music Sources',
	'audio-source-provider': 'Audio Sources',
	'playback-provider': 'Playback',
	'sync-provider': 'Sync & Backup',
	'lyrics-provider': 'Lyrics',
	recommendation: 'Recommendations',
	visualizer: 'Visualizer',
};

const statusConfig: Record<PluginStatus, { icon: LucideIcon; color: string; label: string }> = {
	uninitialized: {
		icon: AlertCircleIcon,
		color: 'text-muted-foreground',
		label: 'Not initialized',
	},
	initializing: { icon: LoaderIcon, color: 'text-yellow-500', label: 'Initializing...' },
	ready: { icon: CheckCircleIcon, color: 'text-muted-foreground', label: 'Ready' },
	active: { icon: CheckCircleIcon, color: 'text-primary', label: 'Active' },
	error: { icon: XCircleIcon, color: 'text-destructive', label: 'Error' },
	disabled: { icon: XCircleIcon, color: 'text-muted-foreground', label: 'Disabled' },
};

export default function PluginsScreen() {
	const [plugins, setPlugins] = useState<PluginDisplayInfo[]>([]);
	const [selectedPlugin, setSelectedPlugin] = useState<PluginDisplayInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const loadPlugins = useCallback(() => {
		const registry = PluginRegistry.getInstance();
		const allPlugins = registry.getAllPlugins();

		const pluginInfos: PluginDisplayInfo[] = allPlugins.map((plugin) => {
			const manifest = plugin.manifest;
			return {
				id: manifest.id,
				name: manifest.name,
				version: manifest.version,
				description: manifest.description,
				category: manifest.category,
				status: registry.getStatus(manifest.id) ?? 'uninitialized',
				isActive: registry.isActive(manifest.id),
				capabilities: manifest.capabilities || [],
			};
		});

		setPlugins(pluginInfos);
		setIsLoading(false);
	}, []);

	useEffect(() => {
		loadPlugins();

		const registry = PluginRegistry.getInstance();
		const unsubscribe = registry.on(() => {
			loadPlugins();
		});

		return unsubscribe;
	}, [loadPlugins]);

	const handleTogglePlugin = async (plugin: PluginDisplayInfo) => {
		const registry = PluginRegistry.getInstance();

		try {
			if (plugin.isActive) {
				await registry.deactivate(plugin.id);
			} else {
				if (plugin.status === 'uninitialized') {
					await registry.initialize(plugin.id);
				}
				await registry.activate(plugin.id);
			}
			loadPlugins();
		} catch (error) {
			logger.error('Failed to toggle plugin:', error instanceof Error ? error : undefined);
		}
	};

	const pluginsByCategory = plugins.reduce(
		(acc, plugin) => {
			if (!acc[plugin.category]) {
				acc[plugin.category] = [];
			}
			acc[plugin.category].push(plugin);
			return acc;
		},
		{} as Record<PluginCategory, PluginDisplayInfo[]>
	);

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
		<SafeAreaView className="bg-background flex-1">
			{}
			<View className="flex-row items-center gap-2 p-4 border-b border-border">
				<Button variant="ghost" size="icon" onPress={() => router.back()}>
					<Icon as={ChevronLeftIcon} />
				</Button>
				<Text className="text-xl font-semibold">Plugins</Text>
			</View>

			<ScrollView className="flex-1" contentContainerClassName="pb-8">
				{isLoading ? (
					<View className="mt-6 mx-4">
						<PluginListSkeleton count={4} />
					</View>
				) : plugins.length === 0 ? (
					<EmptyState />
				) : (
					Object.entries(pluginsByCategory).map(([category, categoryPlugins]) => (
						<PluginSection
							key={category}
							category={category as PluginCategory}
							plugins={categoryPlugins}
							onPluginPress={setSelectedPlugin}
							onToggle={handleTogglePlugin}
						/>
					))
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

function PluginSection({
	category,
	plugins,
	onPluginPress,
	onToggle,
}: {
	category: PluginCategory;
	plugins: PluginDisplayInfo[];
	onPluginPress: (plugin: PluginDisplayInfo) => void;
	onToggle: (plugin: PluginDisplayInfo) => void;
}) {
	const CategoryIcon = categoryIcons[category] || PuzzleIcon;
	const label = categoryLabels[category] || category;

	return (
		<View className="mt-6">
			<View className="flex-row items-center gap-2 px-4 mb-2">
				<Icon as={CategoryIcon} size={16} className="text-muted-foreground" />
				<Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					{label}
				</Text>
			</View>
			<View className="bg-card mx-4 rounded-xl overflow-hidden">
				{plugins.map((plugin, index) => (
					<PluginItem
						key={plugin.id}
						plugin={plugin}
						isLast={index === plugins.length - 1}
						onPress={() => onPluginPress(plugin)}
						onToggle={() => onToggle(plugin)}
					/>
				))}
			</View>
		</View>
	);
}

function PluginItem({
	plugin,
	isLast,
	onPress,
	onToggle,
}: {
	plugin: PluginDisplayInfo;
	isLast: boolean;
	onPress: () => void;
	onToggle: () => void;
}) {
	const statusInfo = statusConfig[plugin.status];
	const StatusIcon = statusInfo.icon;

	return (
		<TouchableOpacity
			className={`flex-row items-center gap-4 py-4 ${!isLast ? 'border-b border-border' : ''}`}
			onPress={onPress}
			activeOpacity={0.7}
		>
			{}
			<View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
				<Icon
					as={categoryIcons[plugin.category] || PuzzleIcon}
					size={24}
					className="text-primary"
				/>
			</View>

			{}
			<View className="flex-1">
				<View className="flex-row items-center gap-2">
					<Text className="font-medium">{plugin.name}</Text>
					<Text variant="muted" className="text-xs">
						v{plugin.version}
					</Text>
				</View>
				<View className="flex-row items-center gap-1 mt-1">
					<Icon as={StatusIcon} size={12} className={statusInfo.color} />
					<Text variant="muted" className="text-xs">
						{statusInfo.label}
					</Text>
				</View>
			</View>

			{}
			<View className="flex-row items-center gap-2">
				<Switch
					value={plugin.isActive}
					onValueChange={onToggle}
					trackColor={{ false: '#767577', true: '#3b82f6' }}
				/>
				<Icon as={ChevronRightIcon} size={20} className="text-muted-foreground" />
			</View>
		</TouchableOpacity>
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
	const statusInfo = statusConfig[plugin.status];
	const StatusIcon = statusInfo.icon;

	return (
		<SafeAreaView className="bg-background flex-1">
			{}
			<View className="flex-row items-center gap-2 p-4 border-b border-border">
				<Button variant="ghost" size="icon" onPress={onBack}>
					<Icon as={ChevronLeftIcon} />
				</Button>
				<Text className="text-xl font-semibold flex-1">{plugin.name}</Text>
				<Switch
					value={plugin.isActive}
					onValueChange={onToggle}
					trackColor={{ false: '#767577', true: '#3b82f6' }}
				/>
			</View>

			<ScrollView className="flex-1" contentContainerClassName="pb-8">
				{}
				<View className="items-center py-8">
					<View className="w-20 h-20 rounded-2xl bg-primary/10 items-center justify-center mb-4">
						<Icon
							as={categoryIcons[plugin.category] || PuzzleIcon}
							size={40}
							className="text-primary"
						/>
					</View>
					<Text className="text-2xl font-bold">{plugin.name}</Text>
					<Text variant="muted">Version {plugin.version}</Text>
					<View className="flex-row items-center gap-1 mt-2">
						<Icon as={StatusIcon} size={16} className={statusInfo.color} />
						<Text className={statusInfo.color}>{statusInfo.label}</Text>
					</View>
				</View>

				{}
				{plugin.description && (
					<View className="mx-4 mb-6">
						<Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
							Description
						</Text>
						<View className="bg-card rounded-xl px-0 py-4">
							<Text>{plugin.description}</Text>
						</View>
					</View>
				)}

				{}
				<View className="mx-4 mb-6">
					<Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
						Category
					</Text>
					<View className="bg-card rounded-xl py-4">
						<Text>{categoryLabels[plugin.category] || plugin.category}</Text>
					</View>
				</View>

				{}
				{plugin.capabilities.length > 0 && (
					<View className="mx-4 mb-6">
						<Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
							Capabilities
						</Text>
						<View className="bg-card rounded-xl py-4">
							<View className="flex-row flex-wrap gap-2">
								{plugin.capabilities.map((cap) => (
									<View key={cap} className="bg-muted px-3 py-1 rounded-full">
										<Text className="text-sm">{cap.replace(/-/g, ' ')}</Text>
									</View>
								))}
							</View>
						</View>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

function EmptyState() {
	return (
		<View className="flex-1 items-center justify-center py-16">
			<View className="bg-muted rounded-full p-6 mb-4">
				<Icon as={PuzzleIcon} size={48} className="text-muted-foreground" />
			</View>
			<Text className="text-xl font-semibold mb-2">No plugins installed</Text>
			<Text variant="muted" className="text-center px-8">
				Plugins extend Aria with new music sources, playback features, and more.
			</Text>
		</View>
	);
}
