/**
 * PluginFolderListField Types
 *
 * Props interfaces for the folder list field and its subcomponents.
 */

import type { PluginConfigSchema } from '@/src/plugins/core/interfaces/base-plugin';

export interface PluginFolderListFieldProps {
	readonly schema: PluginConfigSchema;
	readonly pluginId: string;
}

export interface FolderItemProps {
	readonly uri: string;
	readonly name: string;
	readonly trackCount: number;
	readonly onRemove: (uri: string) => void;
	readonly onRescan: (uri: string) => void;
	readonly disabled: boolean;
}
