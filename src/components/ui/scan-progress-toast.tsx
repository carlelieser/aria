/**
 * ScanProgressToast Component
 *
 * Thin wrapper over ProgressToast for folder scanning progress.
 */

import { memo } from 'react';
import {
	useIsScanning,
	useScanProgress,
} from '@/src/plugins/metadata/local-library/storage/local-library-store';
import type { ScanProgress } from '@/src/plugins/metadata/local-library/types';
import { ProgressToast } from './progress-toast';

function getPhaseMessage(phase: ScanProgress['phase']): string {
	switch (phase) {
		case 'enumerating':
			return 'Finding music files...';
		case 'scanning':
			return 'Scanning music files...';
		case 'indexing':
			return 'Indexing library...';
		case 'complete':
			return 'Scan complete!';
		default:
			return 'Scanning...';
	}
}

function truncateFilename(filename: string | undefined, maxLength: number = 35): string {
	if (!filename) return '';
	if (filename.length <= maxLength) return filename;
	const extension = filename.split('.').pop() || '';
	const nameWithoutExt = filename.slice(0, filename.length - extension.length - 1);
	const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4);
	return `${truncatedName}...${extension}`;
}

export const ScanProgressToast = memo(function ScanProgressToast() {
	const isScanning = useIsScanning();
	const scanProgress = useScanProgress();

	const percentage =
		scanProgress && scanProgress.total > 0
			? Math.round((scanProgress.current / scanProgress.total) * 100)
			: 0;

	const progressText =
		scanProgress && scanProgress.total > 0
			? `${scanProgress.current}/${scanProgress.total} files`
			: '';

	const currentItemLabel = truncateFilename(scanProgress?.currentFile) || null;
	const phaseMessage = scanProgress ? getPhaseMessage(scanProgress.phase) : 'Scanning...';

	return (
		<ProgressToast
			portalName="scan-progress-toast"
			isActive={isScanning}
			isComplete={scanProgress?.phase === 'complete'}
			phaseMessage={phaseMessage}
			percentage={percentage}
			progressText={progressText}
			currentItemLabel={currentItemLabel}
		/>
	);
});
