import { View, StyleSheet } from 'react-native';
import { useCallback, useMemo } from 'react';
import { router, type Href } from 'expo-router';
import { Switch } from 'react-native-paper';
import { PageLayout } from '@/src/components/ui/page-layout';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { EmptyState } from '@/src/components/ui/empty-state';
import { SettingsSection } from '@/src/components/settings/settings-section';
import { SettingsItem } from '@/src/components/settings/settings-item';
import { togglePluginRuntime } from '@/src/application/services/plugin-lifecycle-service';
import { PluginListSkeleton } from '@/src/components/skeletons';
import {
	type PluginDisplayInfo,
	type PluginCategory,
	categoryIcons,
	categoryLabels,
	usePluginDisplayStatus,
	usePluginList,
	DEFAULT_PLUGIN_ICON,
} from '@/src/hooks/use-plugin-display';

export default function PluginsScreen() {
	const { plugins, pluginsByCategory, isLoading } = usePluginList();

	const handleTogglePlugin = useCallback((plugin: PluginDisplayInfo) => {
		if (plugin.isRequired) {
			return;
		}
		togglePluginRuntime(plugin.id);
	}, []);

	return (
		<PageLayout header={{ title: 'Plugins', showBack: true }}>
			<PlayerAwareScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
			>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<PluginListSkeleton count={4} />
					</View>
				) : plugins.length === 0 ? (
					<EmptyState
						icon={DEFAULT_PLUGIN_ICON}
						title={'No plugins available'}
						description={
							'Plugins extend Aria with new music sources, playback features, and more.'
						}
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
			</PlayerAwareScrollView>
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
	const { isEnabled } = usePluginDisplayStatus(plugin);
	const PluginIcon = categoryIcons[plugin.category] || DEFAULT_PLUGIN_ICON;

	const toggle = useMemo(
		() => <Switch value={isEnabled} onValueChange={onToggle} disabled={plugin.isRequired} />,
		[isEnabled, onToggle, plugin.isRequired]
	);

	return (
		<SettingsItem
			icon={PluginIcon}
			iconUrl={plugin.iconUrl}
			title={plugin.name}
			subtitle={`v${plugin.version}`}
			rightElement={toggle}
			showChevron
			onPress={onPress}
		/>
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
});
