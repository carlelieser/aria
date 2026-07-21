/**
 * ImportProgressToast Component
 *
 * Thin wrapper over ProgressToast for library import progress.
 */

import { memo } from 'react';
import { useIsImporting, useImportProgress } from '@/src/application/state/library-import-store';
import { truncateText } from '@/src/domain/utils/formatting';
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

export const ImportProgressToast = memo(function ImportProgressToast() {
	const isImporting = useIsImporting();
	const importProgress = useImportProgress();

	const isActivePhase =
		importProgress.phase === 'tracks' ||
		importProgress.phase === 'albums' ||
		importProgress.phase === 'playlists';

	// A running total of 0 during an active phase means the source imports with an
	// unknown grand total (Spotify): show an indeterminate bar + a cumulative count.
	const indeterminate = isActivePhase && importProgress.total === 0;

	const percentage =
		importProgress.total > 0
			? Math.round((importProgress.current / importProgress.total) * 100)
			: 0;

	const progressText = indeterminate
		? importProgress.current > 0
			? `${importProgress.current} tracks`
			: ''
		: importProgress.total > 0
			? `${importProgress.current}/${importProgress.total}`
			: '';

	const currentItemLabel = truncateText(importProgress.currentItem) || null;
	const phaseMessage = getPhaseMessage(importProgress.phase);

	return (
		<ProgressToast
			portalName={'import-progress-toast'}
			isActive={isImporting}
			isComplete={importProgress.phase === 'complete' || importProgress.phase === 'error'}
			phaseMessage={phaseMessage}
			percentage={percentage}
			progressText={progressText}
			currentItemLabel={currentItemLabel}
			indeterminate={indeterminate}
			subtitle={'This might take a while depending on the size of your library.'}
		/>
	);
});
