/**
 * Batch Action Configuration
 *
 * Maps batch action contexts to their available actions.
 */

import { Download, Library, ListPlus, Trash2, ThumbsUp, ListMusic, Minus } from 'lucide-react-native';
import type { BatchActionContext, BatchActionBarProps, ActionConfig } from './types';

export function getActionsForContext(
	context: BatchActionContext,
	props: BatchActionBarProps
): ActionConfig[] {
	switch (context) {
		case 'explore':
			return [
				{ icon: Download, label: 'Download', handler: props.onDownload },
				{ icon: Library, label: 'Library', handler: props.onAddToLibrary },
				{ icon: ListPlus, label: 'Queue', handler: props.onAddToQueue },
				{ icon: ListMusic, label: 'Playlist', handler: props.onAddToPlaylist },
			];
		case 'library':
			return [
				{ icon: ListPlus, label: 'Queue', handler: props.onAddToQueue },
				{ icon: ListMusic, label: 'Playlist', handler: props.onAddToPlaylist },
				{ icon: ThumbsUp, label: 'Favorite', handler: props.onToggleFavorites },
				{
					icon: Trash2,
					label: 'Remove',
					handler: props.onRemoveFromLibrary,
					destructive: true,
				},
			];
		case 'downloads':
			return [
				{ icon: Library, label: 'Library', handler: props.onAddToLibrary },
				{
					icon: Trash2,
					label: 'Delete',
					handler: props.onDeleteDownloads,
					destructive: true,
				},
			];
		case 'playlist':
			return [
				{ icon: ListPlus, label: 'Queue', handler: props.onAddToQueue },
				{
					icon: Minus,
					label: 'Remove',
					handler: props.onRemoveFromPlaylist,
					destructive: true,
				},
			];
		default:
			return [];
	}
}
