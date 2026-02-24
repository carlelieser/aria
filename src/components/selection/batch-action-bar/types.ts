/**
 * BatchActionBar Types
 *
 * Props interfaces and action configuration types.
 */

import type { Download } from 'lucide-react-native';

export type BatchActionContext = 'explore' | 'library' | 'downloads' | 'playlist';

export interface BatchActionBarProps {
	readonly context: BatchActionContext;
	readonly selectedCount: number;
	readonly onCancel: () => void;
	readonly onDownload?: () => void;
	readonly onAddToLibrary?: () => void;
	readonly onAddToQueue?: () => void;
	readonly onAddToPlaylist?: () => void;
	readonly onRemoveFromLibrary?: () => void;
	readonly onDeleteDownloads?: () => void;
	readonly onToggleFavorites?: () => void;
	readonly onRemoveFromPlaylist?: () => void;
	readonly isProcessing?: boolean;
}

export interface ActionButtonProps {
	readonly icon: typeof Download;
	readonly label: string;
	readonly onPress: () => void;
	readonly disabled?: boolean;
	readonly destructive?: boolean;
}

export interface ActionConfig {
	readonly icon: typeof Download;
	readonly label: string;
	readonly handler: (() => void) | undefined;
	readonly destructive?: boolean;
}
