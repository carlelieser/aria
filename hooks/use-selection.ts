/**
 * useSelection Hook
 *
 * Integration hook for multi-selection functionality.
 */

import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSelectionStore } from '@/src/application/state/selection-store';

export function useSelection() {
	const { isSelectionMode, selectedTrackIds } = useSelectionStore(
		useShallow((s) => ({
			isSelectionMode: s.isSelectionMode,
			selectedTrackIds: s.selectedTrackIds,
		}))
	);

	const { enterSelectionMode, exitSelectionMode, toggleTrackSelection, selectAll, deselectAll } =
		useSelectionStore(
			useShallow((s) => ({
				enterSelectionMode: s.enterSelectionMode,
				exitSelectionMode: s.exitSelectionMode,
				toggleTrackSelection: s.toggleTrackSelection,
				selectAll: s.selectAll,
				deselectAll: s.deselectAll,
			}))
		);

	const isSelected = useCallback(
		(trackId: string) => selectedTrackIds.has(trackId),
		[selectedTrackIds]
	);

	const selectedCount = selectedTrackIds.size;

	return {
		isSelectionMode,
		selectedTrackIds,
		selectedCount,

		enterSelectionMode,
		exitSelectionMode,
		toggleTrackSelection,
		selectAll,
		deselectAll,
		isSelected,
	};
}
