/**
 * Selection Store
 *
 * Zustand store for managing multi-selection state.
 * Used for batch operations in search results.
 */

import { create } from 'zustand';

interface SelectionState {
	isSelectionMode: boolean;
	selectedTrackIds: Set<string>;

	enterSelectionMode: (initialTrackId?: string) => void;
	exitSelectionMode: () => void;
	toggleTrackSelection: (trackId: string) => void;
	selectAll: (trackIds: string[]) => void;
	deselectAll: () => void;
}

export const useSelectionStore = create<SelectionState>()((set, get) => ({
	isSelectionMode: false,
	selectedTrackIds: new Set(),

	enterSelectionMode: (initialTrackId) =>
		set({
			isSelectionMode: true,
			selectedTrackIds: initialTrackId ? new Set([initialTrackId]) : new Set(),
		}),

	exitSelectionMode: () =>
		set({
			isSelectionMode: false,
			selectedTrackIds: new Set(),
		}),

	toggleTrackSelection: (trackId) =>
		set((state) => {
			const newSelected = new Set(state.selectedTrackIds);
			if (newSelected.has(trackId)) {
				newSelected.delete(trackId);
			} else {
				newSelected.add(trackId);
			}

			if (newSelected.size === 0) {
				return {
					isSelectionMode: false,
					selectedTrackIds: new Set(),
				};
			}

			return { selectedTrackIds: newSelected };
		}),

	selectAll: (trackIds) =>
		set({
			isSelectionMode: true,
			selectedTrackIds: new Set(trackIds),
		}),

	deselectAll: () =>
		set((state) => ({
			selectedTrackIds: new Set(),
			isSelectionMode: false,
		})),
}));

export const useIsSelectionMode = () => useSelectionStore((state) => state.isSelectionMode);

export const useSelectedTrackIds = () => useSelectionStore((state) => state.selectedTrackIds);

export const useSelectedCount = () => useSelectionStore((state) => state.selectedTrackIds.size);
