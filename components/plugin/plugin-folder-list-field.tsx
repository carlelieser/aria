/**
 * Plugin Folder List Field Component
 *
 * Manages folder selection for local library scanning.
 * Displays folder list with add/remove functionality.
 */

import { memo, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { FolderPlusIcon, FolderIcon, Trash2Icon, RefreshCwIcon } from 'lucide-react-native';
import { RectButton } from 'react-native-gesture-handler';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { PluginConfigSchema } from '@/src/plugins/core/interfaces/base-plugin';
import {
	useFolders,
	useIsScanning,
} from '@/src/plugins/metadata/local-library/storage/local-library-store';
import { pickFolder } from '@/src/plugins/metadata/local-library/scanner/folder-scanner';
import { PluginRegistry } from '@/src/plugins/core/registry/plugin-registry';
import type { LocalLibraryProvider } from '@/src/plugins/metadata/local-library/local-library-provider';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('PluginFolderListField');

interface PluginFolderListFieldProps {
	schema: PluginConfigSchema;
	pluginId: string;
}

export const PluginFolderListField = memo(function PluginFolderListField({
	schema,
	pluginId,
}: PluginFolderListFieldProps) {
	const { colors } = useAppTheme();
	const folders = useFolders();
	const isScanning = useIsScanning();
	const [isAddingFolder, setIsAddingFolder] = useState(false);

	const getProvider = useCallback((): LocalLibraryProvider | null => {
		const registry = PluginRegistry.getInstance();
		const plugin = registry.getPlugin(pluginId);
		return plugin as LocalLibraryProvider | null;
	}, [pluginId]);

	const handleAddFolder = useCallback(async () => {
		logger.debug('handleAddFolder called');

		const provider = getProvider();
		if (!provider) {
			logger.error(`Cannot add folder: plugin '${pluginId}' not found in registry`);
			return;
		}
		if (isScanning) {
			logger.debug('Scan already in progress, ignoring add folder request');
			return;
		}

		logger.debug('Opening folder picker...');
		setIsAddingFolder(true);
		try {
			const result = await pickFolder();

			if (result.success) {
				logger.info(`Adding folder: ${result.data.name} (${result.data.uri})`);
				await provider.addFolder(result.data.uri, result.data.name);
				logger.info('Folder added successfully');
			} else {
				logger.debug('Folder selection cancelled or failed', result.error);
			}
		} catch (error) {
			logger.error('Failed to add folder', error instanceof Error ? error : undefined);
		} finally {
			setIsAddingFolder(false);
		}
	}, [getProvider, pluginId, isScanning]);

	const handleRemoveFolder = useCallback(
		async (folderUri: string) => {
			const provider = getProvider();
			if (!provider || isScanning) return;

			try {
				await provider.removeFolder(folderUri);
				logger.info(`Removed folder: ${folderUri}`);
			} catch (error) {
				logger.error('Failed to remove folder', error instanceof Error ? error : undefined);
			}
		},
		[getProvider, isScanning]
	);

	const handleRescanFolder = useCallback(
		async (folderUri: string) => {
			const provider = getProvider();
			if (!provider || isScanning) return;

			try {
				await provider.rescanFolder(folderUri);
			} catch (error) {
				logger.error('Failed to rescan folder', error instanceof Error ? error : undefined);
			}
		},
		[getProvider, isScanning]
	);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.headerText}>
					<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
						{schema.label}
					</Text>
					{schema.description && (
						<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
							{schema.description}
						</Text>
					)}
				</View>
				<Button
					variant="secondary"
					size="sm"
					onPress={handleAddFolder}
					disabled={isScanning || isAddingFolder}
					icon={<Icon as={FolderPlusIcon} size="sm" color={colors.primary} />}
				>
					Add
				</Button>
			</View>

			{folders.length === 0 ? (
				<View style={[styles.emptyState, { backgroundColor: colors.surfaceContainerLow }]}>
					<Icon as={FolderIcon} size="lg" color={colors.onSurfaceVariant} />
					<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
						No folders added
					</Text>
				</View>
			) : (
				<View style={[styles.folderList, { backgroundColor: colors.surfaceContainerLow }]}>
					{folders.map((folder) => (
						<FolderItem
							key={folder.uri}
							uri={folder.uri}
							name={folder.name}
							trackCount={folder.trackCount}
							onRemove={handleRemoveFolder}
							onRescan={handleRescanFolder}
							disabled={isScanning}
						/>
					))}
				</View>
			)}
		</View>
	);
});

interface FolderItemProps {
	uri: string;
	name: string;
	trackCount: number;
	onRemove: (uri: string) => void;
	onRescan: (uri: string) => void;
	disabled: boolean;
}

const FolderItem = memo(function FolderItem({
	uri,
	name,
	trackCount,
	onRemove,
	onRescan,
	disabled,
}: FolderItemProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.folderItem}>
			<View style={[styles.folderIcon, { backgroundColor: colors.surfaceContainerHighest }]}>
				<Icon as={FolderIcon} size="sm" color={colors.onSurfaceVariant} />
			</View>
			<View style={styles.folderInfo}>
				<Text variant="bodyMedium" numberOfLines={1} style={{ color: colors.onSurface }}>
					{name}
				</Text>
				<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
					{trackCount} {trackCount === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
			<RectButton
				onPress={() => onRescan(uri)}
				enabled={!disabled}
				style={styles.actionButton}
			>
				<Icon
					as={RefreshCwIcon}
					size="sm"
					color={disabled ? colors.outline : colors.onSurfaceVariant}
				/>
			</RectButton>
			<RectButton
				onPress={() => onRemove(uri)}
				enabled={!disabled}
				style={styles.actionButton}
			>
				<Icon as={Trash2Icon} size="sm" color={disabled ? colors.outline : colors.error} />
			</RectButton>
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 12,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 16,
	},
	headerText: {
		flex: 1,
		gap: 2,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
		borderRadius: 12,
		gap: 8,
	},
	folderList: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	folderItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		gap: 12,
	},
	folderIcon: {
		width: 36,
		height: 36,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	folderInfo: {
		flex: 1,
	},
	actionButton: {
		padding: 8,
		borderRadius: 8,
	},
});
