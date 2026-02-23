import { useMemo } from 'react';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { useDownloadStore } from '@/src/application/state/download-store';
import type { Track } from '@/src/domain/entities/track';

export type DownloadState = 'none' | 'partial' | 'downloading' | 'complete';

export function useCollectionDownloadState(tracks: readonly Track[]): {
	state: DownloadState;
	downloadedCount: number;
	totalCount: number;
} {
	const trackIds = useMemo(() => tracks.map((t) => t.id.value), [tracks]);

	const downloadedCount = useStoreWithEqualityFn(
		useDownloadStore,
		(state) => {
			let count = 0;
			for (const id of trackIds) {
				if (state.downloadedTracks.has(id)) count++;
			}
			return count;
		},
		(a, b) => a === b
	);

	const hasActiveDownload = useStoreWithEqualityFn(
		useDownloadStore,
		(state) => {
			for (const id of trackIds) {
				if (state.downloadedTracks.has(id)) continue;
				const info = state.downloads.get(id);
				if (info && (info.status === 'pending' || info.status === 'downloading')) {
					return true;
				}
			}
			return false;
		},
		(a, b) => a === b
	);

	const totalCount = tracks.length;

	const derivedState = useMemo((): DownloadState => {
		if (totalCount === 0) return 'none';
		if (hasActiveDownload) return 'downloading';
		if (downloadedCount === totalCount) return 'complete';
		if (downloadedCount > 0) return 'partial';
		return 'none';
	}, [totalCount, hasActiveDownload, downloadedCount]);

	return { state: derivedState, downloadedCount, totalCount };
}
