/**
 * DownloadStatus
 *
 * Renders the download status row (progress %, completed info, or error).
 */

import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { CheckCircle, AlertCircle } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';
import { formatDate } from '@/src/domain/utils/formatting';
import { formatFileSize } from '@/src/hooks/use-download-queue';
import type { useAppTheme } from '@/lib/theme';
import { styles } from './styles';

interface DownloadStatusProps {
	readonly downloadInfo: DownloadInfo;
	readonly colors: ReturnType<typeof useAppTheme>['colors'];
}

export function DownloadStatus({ downloadInfo, colors }: DownloadStatusProps) {
	const isDownloading =
		downloadInfo.status === 'pending' || downloadInfo.status === 'downloading';
	const isCompleted = downloadInfo.status === 'completed';
	const isFailed = downloadInfo.status === 'failed';

	if (isDownloading && downloadInfo.progress > 0) {
		return (
			<View style={styles.statusRow}>
				<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
					{downloadInfo.progress}%
				</Text>
			</View>
		);
	}

	if (isCompleted && downloadInfo.fileSize && downloadInfo.downloadedAt) {
		return (
			<View style={styles.statusRow}>
				<Icon as={CheckCircle} size={12} color={colors.primary} />
				<Text
					variant={'bodySmall'}
					style={[styles.statusText, { color: colors.onSurfaceVariant }]}
				>
					{formatFileSize(downloadInfo.fileSize)} ·{' '}
					{formatDate(downloadInfo.downloadedAt)}
				</Text>
			</View>
		);
	}

	if (isFailed) {
		return (
			<View style={styles.statusRow}>
				<Icon as={AlertCircle} size={12} color={colors.error} />
				<Text
					variant={'bodySmall'}
					numberOfLines={1}
					style={[styles.statusText, { color: colors.error }]}
				>
					{downloadInfo.error ?? 'Download failed'}
				</Text>
			</View>
		);
	}

	return null;
}
