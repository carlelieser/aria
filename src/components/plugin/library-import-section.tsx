/**
 * LibraryImportSection Component
 *
 * Renders a "Library" settings section with an import button
 * for plugins that support library import operations.
 */

import { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SettingsSection } from '@/src/components/settings/settings-section';
import { useAppTheme } from '@/lib/theme';
import { useIsPluginEnabled } from '@/src/application/state/plugin-settings-store';
import { useIsImporting, useLastImportedAt } from '@/src/application/state/library-import-store';
import { getPluginHasImportCapability, triggerPluginImport } from '@/src/hooks/use-plugin-registry';

interface LibraryImportSectionProps {
	readonly pluginId: string;
}

function formatLastImported(timestamp: number | undefined): string | null {
	if (!timestamp) return null;
	const date = new Date(timestamp);
	return `Last imported ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export const LibraryImportSection = memo(function LibraryImportSection({
	pluginId,
}: LibraryImportSectionProps) {
	const { colors } = useAppTheme();
	const isEnabled = useIsPluginEnabled(pluginId);
	const isImporting = useIsImporting();
	const lastImportedAt = useLastImportedAt(pluginId);

	const hasImportCapability = useMemo(() => getPluginHasImportCapability(pluginId), [pluginId]);

	const handleImport = useCallback(async () => {
		await triggerPluginImport(pluginId);
	}, [pluginId]);

	if (!hasImportCapability) {
		return null;
	}

	const lastImportedText = formatLastImported(lastImportedAt);

	return (
		<SettingsSection title={'Library'}>
			<View style={styles.container}>
				<View style={styles.content}>
					<Text variant={'bodyMedium'} style={{ color: colors.onSurface }}>
						Import your saved tracks, albums, and playlists into your local library.
					</Text>
					{lastImportedText && (
						<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
							{lastImportedText}
						</Text>
					)}
				</View>
				<Button
					mode={'contained-tonal'}
					onPress={handleImport}
					disabled={!isEnabled || isImporting}
					loading={isImporting}
					style={styles.button}
				>
					{isImporting ? 'Importing...' : 'Import Library'}
				</Button>
			</View>
		</SettingsSection>
	);
});

const styles = StyleSheet.create({
	container: {
		padding: 16,
		gap: 12,
	},
	content: {
		gap: 4,
	},
	button: {
		alignSelf: 'flex-start',
	},
});
