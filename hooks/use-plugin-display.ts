import { useMemo, useState, useEffect, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import {
	MusicIcon,
	PlayCircleIcon,
	CloudIcon,
	LibraryBigIcon,
	CheckCircleIcon,
	XCircleIcon,
	AlertCircleIcon,
	LoaderIcon,
	PlugIcon,
	MicIcon,
	SparklesIcon,
	WavesIcon,
} from 'lucide-react-native';
import { PluginRegistry } from '@/src/plugins/core/registry/plugin-registry';
import { PluginManifestRegistry } from '@/src/plugins/core/registry/plugin-manifest-registry';
import type { PluginStatus, PluginCategory } from '@/src/plugins/core/interfaces/base-plugin';
import {
	useIsPluginEnabled,
	REQUIRED_PLUGINS,
} from '@/src/application/state/plugin-settings-store';
import { useAppTheme } from '@/lib/theme';

export type { PluginCategory };

export interface PluginDisplayInfo {
	id: string;
	name: string;
	version: string;
	description?: string;
	category: PluginCategory;
	status: PluginStatus;
	isLoaded: boolean;
	isRequired: boolean;
	capabilities: string[];
	requiresAuth?: boolean;
}

export const categoryIcons: Record<PluginCategory, LucideIcon> = {
	'metadata-provider': MusicIcon,
	'audio-source-provider': MusicIcon,
	'playback-provider': PlayCircleIcon,
	'sync-provider': CloudIcon,
	'lyrics-provider': MicIcon,
	recommendation: SparklesIcon,
	visualizer: WavesIcon,
	'actions-provider': LibraryBigIcon,
};

export const DEFAULT_PLUGIN_ICON: LucideIcon = PlugIcon;

export const categoryLabels: Record<PluginCategory, string> = {
	'metadata-provider': 'Music Sources',
	'audio-source-provider': 'Audio Sources',
	'playback-provider': 'Playback',
	'sync-provider': 'Sync & Backup',
	'lyrics-provider': 'Lyrics',
	recommendation: 'Recommendations',
	visualizer: 'Visualizer',
	'actions-provider': 'Actions',
};

export const statusConfig: Record<
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

function _buildPluginDisplayInfo(manifestId: string): PluginDisplayInfo | null {
	const manifestRegistry = PluginManifestRegistry.getInstance();
	const pluginRegistry = PluginRegistry.getInstance();

	const manifest = manifestRegistry.getManifest(manifestId);
	if (!manifest) {
		return null;
	}

	const loadedPlugin = pluginRegistry.getPlugin(manifest.id);
	const isLoaded = !!loadedPlugin;
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
		isLoaded,
		isRequired,
		capabilities: manifest.capabilities || [],
		requiresAuth: manifest.capabilitiesDetail?.requiresAuth,
	};
}

export function usePluginDisplayStatus(plugin: PluginDisplayInfo | null) {
	const { colors } = useAppTheme();
	const isEnabled = useIsPluginEnabled(plugin?.id ?? '');

	if (!plugin) {
		const defaultStatus = statusConfig.uninitialized;
		return {
			isEnabled: false,
			displayStatus: 'uninitialized' as PluginStatus,
			statusInfo: defaultStatus,
			StatusIcon: defaultStatus.icon,
			statusColor: colors[defaultStatus.colorKey],
		};
	}

	let displayStatus: PluginStatus;
	if (!isEnabled) {
		displayStatus = 'disabled';
	} else if (plugin.isLoaded) {
		displayStatus = plugin.status;
	} else {
		displayStatus = 'uninitialized';
	}

	const statusInfo = statusConfig[displayStatus];

	return {
		isEnabled,
		displayStatus,
		statusInfo,
		StatusIcon: statusInfo.icon,
		statusColor: colors[statusInfo.colorKey],
	};
}

export function usePluginById(id: string): PluginDisplayInfo | null {
	return useMemo(() => _buildPluginDisplayInfo(id), [id]);
}

export function usePluginList() {
	const [plugins, setPlugins] = useState<PluginDisplayInfo[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const loadPlugins = useCallback(() => {
		const manifestRegistry = PluginManifestRegistry.getInstance();
		const availableManifests = manifestRegistry.getAvailablePlugins();

		const pluginInfos = availableManifests
			.map((manifest) => _buildPluginDisplayInfo(manifest.id))
			.filter((info): info is PluginDisplayInfo => info !== null);

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

	return { plugins, pluginsByCategory, isLoading };
}
