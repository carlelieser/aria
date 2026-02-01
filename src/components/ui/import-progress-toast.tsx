/**
 * ImportProgressToast Component
 *
 * Thin wrapper over ProgressToast for library import progress.
 */

import { memo } from 'react';
import { useIsImporting, useImportProgress } from '@/src/application/state/library-import-store';
import { ProgressToast } from './progress-toast';

function getPhaseMessage(phase: string): string {
	switch (phase) {
		case 'tracks':
			return 'Importing tracks...';
		case 'albums':
			return 'Importing albums...';
		case 'playlists':
			return 'Importing playlists...';
		case 'complete':
			return 'Import complete!';
		case 'error':
			return 'Import failed';
		default:
			return 'Importing...';
	}
}

function truncateItemName(name: string | null, maxLength: number = 35): string {
	if (!name) return '';
	if (name.length <= maxLength) return name;
	return `${name.slice(0, maxLength - 3)}...`;
}

export const ImportProgressToast = memo(function ImportProgressToast() {
	const isImporting = useIsImporting();
	const importProgress = useImportProgress();

	const percentage =
		importProgress.total > 0
			? Math.round((importProgress.current / importProgress.total) * 100)
			: 0;

	const progressText =
		importProgress.total > 0
			? `${importProgress.current}/${importProgress.total}`
			: '';

	const currentItemLabel = truncateItemName(importProgress.currentItem) || null;
	const phaseMessage = getPhaseMessage(importProgress.phase);

	return (
		<ProgressToast
			portalName="import-progress-toast"
			isActive={isImporting}
			isComplete={importProgress.phase === 'complete'}
			phaseMessage={phaseMessage}
			percentage={percentage}
			progressText={progressText}
			currentItemLabel={currentItemLabel}
		/>
	);
});
