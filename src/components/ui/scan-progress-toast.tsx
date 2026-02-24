/**
 * ScanProgressToast Component
 *
 * Thin wrapper over ProgressToast for folder scanning progress.
 */

import { memo } from 'react';
import { useIsScanning, useScanProgress } from '@/src/hooks/use-local-library';
import type { ScanProgress } from '@shared/types/local-library-types';
import { truncateFilename } from '@/src/domain/utils/formatting';
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
			portalName={'scan-progress-toast'}
			isActive={isScanning}
			isComplete={scanProgress?.phase === 'complete'}
			phaseMessage={phaseMessage}
			percentage={percentage}
			progressText={progressText}
			currentItemLabel={currentItemLabel}
		/>
	);
});
