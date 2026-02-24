/**
 * PluginFolderListField Component
 *
 * Manages folder selection for local library scanning.
 * Displays folder list with add/remove functionality.
 */

import { memo, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { FolderPlusIcon, FolderIcon } from 'lucide-react-native';
import { Button } from '@/src/components/ui/button';
import { Icon } from '@/src/components/ui/icon';
import { EmptyState } from '@/src/components/ui/empty-state';
import { useAppTheme } from '@/lib/theme';
import { useFolders, useIsScanning, pickLibraryFolder } from '@/src/hooks/use-local-library';
import { getTypedPlugin } from '@/src/hooks/use-plugin-registry';
import { getLogger } from '@shared/services/logger';
import { FolderItem } from './folder-item';
import type { PluginFolderListFieldProps } from './types';

export type { PluginFolderListFieldProps } from './types';

const logger = getLogger('PluginFolderListField');

interface FolderCapablePlugin {
	addFolder(uri: string, name: string): Promise<void>;
	removeFolder(uri: string): Promise<void>;
	rescanFolder(uri: string): Promise<void>;
}

export const PluginFolderListField = memo(function PluginFolderListField({
	schema,
	pluginId,
}: PluginFolderListFieldProps) {
	const { colors } = useAppTheme();
	const folders = useFolders();
	const isScanning = useIsScanning();
	const [isAddingFolder, setIsAddingFolder] = useState(false);

	const getProvider = useCallback((): FolderCapablePlugin | null => {
		return getTypedPlugin<FolderCapablePlugin>(pluginId);
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
			const result = await pickLibraryFolder();

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
					<Text variant={'bodyMedium'} style={{ color: colors.onSurface }}>
						{schema.label}
					</Text>
					{schema.description && (
						<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
							{schema.description}
						</Text>
					)}
				</View>
				<Button
					variant={'secondary'}
					onPress={handleAddFolder}
					disabled={isScanning || isAddingFolder}
					icon={<Icon as={FolderPlusIcon} size={'sm'} color={colors.primary} />}
				>
					Add
				</Button>
			</View>

			{folders.length === 0 ? (
				<EmptyState icon={FolderIcon} title={'No folders added'} />
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
	folderList: {
		borderRadius: 12,
		overflow: 'hidden',
	},
});
