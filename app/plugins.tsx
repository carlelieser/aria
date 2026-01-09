/**
 * PluginsScreen
 *
 * Manage plugins for music sources and features.
 * Uses M3 theming.
 */

import { View, ScrollView, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Text, Surface } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { PageLayout } from '@/components/page-layout';
import { EmptyState } from '@/components/empty-state';
import { getLogger } from '@/src/shared/services/logger';
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
  type LucideIcon,
} from 'lucide-react-native';
import { PluginRegistry } from '@/src/plugins/core/registry/plugin-registry';
import type {
  PluginStatus,
  PluginCategory,
} from '@/src/plugins/core/interfaces/base-plugin';
import { PluginListSkeleton } from '@/components/skeletons';
import { useAppTheme } from '@/lib/theme';

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

const statusConfig: Record<PluginStatus, { icon: LucideIcon; colorKey: 'onSurfaceVariant' | 'primary' | 'error' | 'tertiary'; label: string }> = {
  uninitialized: {
    icon: AlertCircleIcon,
    colorKey: 'onSurfaceVariant',
    label: 'Not initialized',
  },
  initializing: { icon: LoaderIcon, colorKey: 'tertiary', label: 'Initializing...' },
  ready: { icon: CheckCircleIcon, colorKey: 'onSurfaceVariant', label: 'Ready' },
  active: { icon: CheckCircleIcon, colorKey: 'primary', label: 'Active' },
  error: { icon: XCircleIcon, colorKey: 'error', label: 'Error' },
  disabled: { icon: XCircleIcon, colorKey: 'onSurfaceVariant', label: 'Disabled' },
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
    <PageLayout header={{ title: 'Plugins', showBack: true, compact: true }}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <PluginListSkeleton count={4} />
          </View>
        ) : plugins.length === 0 ? (
          <EmptyState
            icon={PuzzleIcon}
            title="No plugins installed"
            description="Plugins extend Aria with new music sources, playback features, and more."
          />
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
    </PageLayout>
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
  const { colors } = useAppTheme();
  const CategoryIcon = categoryIcons[category] || PuzzleIcon;
  const label = categoryLabels[category] || category;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon as={CategoryIcon} size={16} color={colors.onSurfaceVariant} />
        <Text variant="labelMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Surface style={[styles.sectionContent, { backgroundColor: colors.surfaceContainerLow }]}>
        {plugins.map((plugin, index) => (
          <PluginItem
            key={plugin.id}
            plugin={plugin}
            isLast={index === plugins.length - 1}
            onPress={() => onPluginPress(plugin)}
            onToggle={() => onToggle(plugin)}
          />
        ))}
      </Surface>
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
  const { colors } = useAppTheme();
  const statusInfo = statusConfig[plugin.status];
  const StatusIcon = statusInfo.icon;
  const statusColor = colors[statusInfo.colorKey];

  return (
    <TouchableOpacity
      style={[
        styles.pluginItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.pluginIcon, { backgroundColor: `${colors.primary}1A` }]}>
        <Icon
          as={categoryIcons[plugin.category] || PuzzleIcon}
          size={24}
          color={colors.primary}
        />
      </View>

      <View style={styles.pluginText}>
        <View style={styles.pluginTitleRow}>
          <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '500' }}>
            {plugin.name}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
            v{plugin.version}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Icon as={StatusIcon} size={12} color={statusColor} />
          <Text variant="labelSmall" style={{ color: statusColor }}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      <View style={styles.pluginActions}>
        <Switch
          value={plugin.isActive}
          onValueChange={onToggle}
          trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
          thumbColor={colors.surface}
        />
        <Icon as={ChevronRightIcon} size={20} color={colors.onSurfaceVariant} />
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
  const { colors } = useAppTheme();
  const statusInfo = statusConfig[plugin.status];
  const StatusIcon = statusInfo.icon;
  const statusColor = colors[statusInfo.colorKey];

  const headerRightActions = (
    <Switch
      value={plugin.isActive}
      onValueChange={onToggle}
      trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
      thumbColor={colors.surface}
    />
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
          <View style={[styles.detailIcon, { backgroundColor: `${colors.primary}1A` }]}>
            <Icon
              as={categoryIcons[plugin.category] || PuzzleIcon}
              size={40}
              color={colors.primary}
            />
          </View>
          <Text variant="headlineSmall" style={{ color: colors.onSurface, fontWeight: '700' }}>
            {plugin.name}
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            Version {plugin.version}
          </Text>
          <View style={styles.statusRow}>
            <Icon as={StatusIcon} size={16} color={statusColor} />
            <Text variant="bodySmall" style={{ color: statusColor }}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {plugin.description && (
          <View style={styles.detailSection}>
            <Text variant="labelMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
              DESCRIPTION
            </Text>
            <Surface style={[styles.detailCard, { backgroundColor: colors.surfaceContainerLow }]}>
              <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
                {plugin.description}
              </Text>
            </Surface>
          </View>
        )}

        <View style={styles.detailSection}>
          <Text variant="labelMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            CATEGORY
          </Text>
          <Surface style={[styles.detailCard, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
              {categoryLabels[plugin.category] || plugin.category}
            </Text>
          </Surface>
        </View>

        {plugin.capabilities.length > 0 && (
          <View style={styles.detailSection}>
            <Text variant="labelMedium" style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
              CAPABILITIES
            </Text>
            <Surface style={[styles.detailCard, { backgroundColor: colors.surfaceContainerLow }]}>
              <View style={styles.capabilitiesContainer}>
                {plugin.capabilities.map((cap) => (
                  <View key={cap} style={[styles.capabilityChip, { backgroundColor: colors.surfaceContainerHighest }]}>
                    <Text variant="labelSmall" style={{ color: colors.onSurface }}>
                      {cap.replace(/-/g, ' ')}
                    </Text>
                  </View>
                ))}
              </View>
            </Surface>
          </View>
        )}
      </ScrollView>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pluginItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  pluginIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pluginText: {
    flex: 1,
  },
  pluginTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  pluginActions: {
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
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  detailCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
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
