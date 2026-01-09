/**
 * SettingsScreen
 *
 * App settings and preferences.
 * Uses M3 theming.
 */

import { View, ScrollView, Alert, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text, Surface, SegmentedButtons } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { PageLayout } from '@/components/page-layout';
import {
  ChevronRightIcon,
  TrashIcon,
  InfoIcon,
  HeartIcon,
  PuzzleIcon,
  HardDriveIcon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { useLibraryStore } from '@/src/application/state/library-store';
import { useDownloadStore } from '@/src/application/state/download-store';
import {
  useSettingsStore,
  type ThemePreference,
  type DefaultTab,
} from '@/src/application/state/settings-store';
import { useDownloadQueue, formatFileSize } from '@/hooks/use-download-queue';
import { clearAllDownloads } from '@/src/infrastructure/filesystem/download-manager';
import { useToast } from '@/hooks/use-toast';
import { useAppTheme } from '@/lib/theme';
import Constants from 'expo-constants';

const THEME_BUTTONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const DEFAULT_TAB_BUTTONS = [
  { value: 'index', label: 'Library' },
  { value: 'explore', label: 'Explore' },
  { value: 'downloads', label: 'Downloads' },
  { value: 'settings', label: 'Settings' },
];

export default function SettingsScreen() {
  const { tracks, playlists, favorites } = useLibraryStore();
  const { themePreference, setThemePreference, defaultTab, setDefaultTab } = useSettingsStore();
  const { stats } = useDownloadQueue();
  const { success, error } = useToast();
  const { colors } = useAppTheme();

  const handleClearLibrary = () => {
    Alert.alert(
      'Clear Library',
      'This will remove all tracks, playlists, and favorites. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            useLibraryStore.setState({
              tracks: [],
              playlists: [],
              favorites: new Set(),
            });
            success('Library cleared', 'All tracks, playlists, and favorites have been removed');
          },
        },
      ]
    );
  };

  const handleClearDownloads = () => {
    Alert.alert(
      'Clear All Downloads',
      'This will remove all downloaded files. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const result = await clearAllDownloads();
            if (result.success) {
              useDownloadStore.setState({
                downloads: new Map(),
                downloadedTracks: new Map(),
              });
              success('Downloads cleared', 'All downloaded files have been removed');
            } else {
              error('Failed to clear downloads', result.error.message);
            }
          },
        },
      ]
    );
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <PageLayout header={{ icon: SettingsIcon, title: 'Settings' }}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <SettingsSection title="Appearance">
          <View style={styles.themeSelector}>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
              Theme
            </Text>
            <SegmentedButtons
              value={themePreference}
              onValueChange={(value) => setThemePreference(value as ThemePreference)}
              buttons={THEME_BUTTONS}
              style={styles.segmentedButtons}
            />
          </View>
          <View style={styles.defaultTabSelector}>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
              Default Home Screen
            </Text>
            <SegmentedButtons
              value={defaultTab}
              onValueChange={(value) => setDefaultTab(value as DefaultTab)}
              buttons={DEFAULT_TAB_BUTTONS}
              style={styles.segmentedButtons}
              density="small"
            />
          </View>
        </SettingsSection>

        <SettingsSection title="Plugins">
          <SettingsItem
            icon={PuzzleIcon}
            title="Manage Plugins"
            subtitle="Music sources, playback, and more"
            onPress={() => router.navigate('/plugins' as const)}
            showChevron
          />
        </SettingsSection>

        <SettingsSection title="Storage">
          <SettingsItem
            icon={HardDriveIcon}
            title="Storage Used"
            subtitle={`${formatFileSize(stats.totalSize)} · ${stats.completedCount} files`}
          />
          {stats.completedCount > 0 && (
            <SettingsItem
              icon={TrashIcon}
              title="Clear All Downloads"
              subtitle="Remove all downloaded files"
              onPress={handleClearDownloads}
              destructive
            />
          )}
        </SettingsSection>

        <SettingsSection title="Library">
          <SettingsItem
            icon={InfoIcon}
            title="Library Stats"
            subtitle={`${tracks.length} tracks · ${playlists.length} playlists · ${favorites.size} favorites`}
          />
          <SettingsItem
            icon={TrashIcon}
            title="Clear Library"
            subtitle="Remove all tracks and playlists"
            onPress={handleClearLibrary}
            destructive
          />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsItem icon={InfoIcon} title="Version" subtitle={appVersion} />
          <SettingsItem
            icon={HeartIcon}
            title="Made with love"
            subtitle="A clean architecture music player"
          />
        </SettingsSection>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
            Aria Music Player
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}
          >
            Built with Expo, React Native, and TypeScript
          </Text>
        </View>
      </ScrollView>
    </PageLayout>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.section}>
      <Text
        variant="labelMedium"
        style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}
      >
        {title.toUpperCase()}
      </Text>
      <Surface style={[styles.sectionContent, { backgroundColor: colors.surfaceContainerLow }]}>
        {children}
      </Surface>
    </View>
  );
}

function SettingsItem({
  icon: IconComponent,
  title,
  subtitle,
  onPress,
  destructive = false,
  showChevron = false,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}) {
  const { colors } = useAppTheme();

  const content = (
    <View style={[styles.settingsItem, { borderBottomColor: colors.outlineVariant }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: destructive ? `${colors.error}1A` : colors.surfaceContainerHighest },
        ]}
      >
        <Icon
          as={IconComponent}
          size={20}
          color={destructive ? colors.error : colors.onSurface}
        />
      </View>
      <View style={styles.itemText}>
        <Text
          variant="bodyMedium"
          style={{ color: destructive ? colors.error : colors.onSurface, fontWeight: '500' }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        )}
      </View>
      {showChevron && <Icon as={ChevronRightIcon} size={20} color={colors.onSurfaceVariant} />}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  themeSelector: {
    padding: 16,
    gap: 12,
  },
  defaultTabSelector: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  segmentedButtons: {
    alignSelf: 'stretch',
  },
});
