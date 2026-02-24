/**
 * DownloadActions
 *
 * Renders download-specific action buttons (cancel, delete, retry).
 */

import { IconButton } from 'react-native-paper';
import { X, Trash2, RotateCcw } from 'lucide-react-native';
import type { Track } from '@/src/domain/entities/track';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';
import type { useAppTheme } from '@/lib/theme';

interface DownloadActionsProps {
	readonly downloadInfo: DownloadInfo;
	readonly track: Track;
	readonly colors: ReturnType<typeof useAppTheme>['colors'];
	readonly onRemove: () => void;
	readonly onRetry?: (track: Track) => void;
}

export function DownloadActions({
	downloadInfo,
	track,
	colors,
	onRemove,
	onRetry,
}: DownloadActionsProps) {
	const isDownloading =
		downloadInfo.status === 'pending' || downloadInfo.status === 'downloading';
	const isCompleted = downloadInfo.status === 'completed';
	const isFailed = downloadInfo.status === 'failed';

	if (isDownloading) {
		return (
			<IconButton
				icon={({ size }) => <X size={size} color={colors.onSurfaceVariant} />}
				size={20}
				onPress={onRemove}
			/>
		);
	}

	if (isCompleted) {
		return (
			<IconButton
				icon={({ size }) => <Trash2 size={size} color={colors.onSurfaceVariant} />}
				size={20}
				onPress={onRemove}
			/>
		);
	}

	if (isFailed && onRetry) {
		return (
			<IconButton
				icon={({ size }) => <RotateCcw size={size} color={colors.onSurfaceVariant} />}
				size={20}
				onPress={() => onRetry(track)}
			/>
		);
	}

	return null;
}
