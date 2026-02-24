import { create } from 'zustand';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
	DownloadInfo,
	DownloadedTrackMetadata,
} from '../../domain/value-objects/download-state';
import {
	createPendingDownload,
	createDownloadingInfo,
	createCompletedDownload,
	createFailedDownload,
} from '../../domain/value-objects/download-state';

interface TrackMetadataParams {
	title: string;
	artistName: string;
	artworkUrl?: string;
	albumId?: string;
	albumName?: string;
}

interface DownloadState {
	downloads: Map<string, DownloadInfo>;
	downloadedTracks: Map<string, DownloadedTrackMetadata>;

	startDownload: (trackId: string, metadata: TrackMetadataParams) => void;
	updateProgress: (trackId: string, progress: number) => void;
	completeDownload: (trackId: string, metadata: DownloadedTrackMetadata) => void;
	failDownload: (trackId: string, error: string) => void;
	removeDownload: (trackId: string) => void;
	clearActiveDownloads: () => void;
	clearAll: () => void;

	isDownloaded: (trackId: string) => boolean;
	isDownloading: (trackId: string) => boolean;
	getDownloadInfo: (trackId: string) => DownloadInfo | undefined;
	getDownloadedTrack: (trackId: string) => DownloadedTrackMetadata | undefined;
	getLocalFilePath: (trackId: string) => string | null;
	getAllDownloadedTracks: () => DownloadedTrackMetadata[];
	getActiveDownloadsCount: () => number;
}

const customStorage = {
	getItem: async (name: string): Promise<string | null> => {
		const value = await AsyncStorage.getItem(name);
		return value;
	},
	setItem: async (name: string, value: string): Promise<void> => {
		await AsyncStorage.setItem(name, value);
	},
	removeItem: async (name: string): Promise<void> => {
		await AsyncStorage.removeItem(name);
	},
};

export const useDownloadStore = create<DownloadState>()(
	persist(
		(set, get) => ({
			downloads: new Map<string, DownloadInfo>(),
			downloadedTracks: new Map<string, DownloadedTrackMetadata>(),

			startDownload: (trackId: string, metadata: TrackMetadataParams) => {
				set((state) => {
					const newDownloads = new Map(state.downloads);
					newDownloads.set(trackId, createPendingDownload(trackId, metadata));
					return { downloads: newDownloads };
				});
			},

			updateProgress: (trackId: string, progress: number) => {
				const existing = get().downloads.get(trackId);
				if (!existing) return;

				const lastProgress = existing.progress ?? 0;
				const isCompletion = progress >= 100;
				const isMeaningfulChange = Math.abs(progress - lastProgress) >= 2;

				if (!isCompletion && !isMeaningfulChange) return;

				set((state) => {
					const current = state.downloads.get(trackId);
					if (!current) return state;

					const newDownloads = new Map(state.downloads);
					newDownloads.set(trackId, createDownloadingInfo(current, progress));
					return { downloads: newDownloads };
				});
			},

			completeDownload: (trackId: string, metadata: DownloadedTrackMetadata) => {
				set((state) => {
					const existing = state.downloads.get(trackId);
					if (!existing) return state;

					const newDownloads = new Map(state.downloads);
					newDownloads.set(
						trackId,
						createCompletedDownload(existing, metadata.filePath, metadata.fileSize)
					);

					const newDownloadedTracks = new Map(state.downloadedTracks);
					newDownloadedTracks.set(trackId, metadata);

					return {
						downloads: newDownloads,
						downloadedTracks: newDownloadedTracks,
					};
				});
			},

			failDownload: (trackId: string, error: string) => {
				set((state) => {
					const existing = state.downloads.get(trackId);
					if (!existing) return state;

					const newDownloads = new Map(state.downloads);
					newDownloads.set(trackId, createFailedDownload(existing, error));
					return { downloads: newDownloads };
				});
			},

			removeDownload: (trackId: string) => {
				set((state) => {
					const newDownloads = new Map(state.downloads);
					newDownloads.delete(trackId);

					const newDownloadedTracks = new Map(state.downloadedTracks);
					newDownloadedTracks.delete(trackId);

					return {
						downloads: newDownloads,
						downloadedTracks: newDownloadedTracks,
					};
				});
			},

			clearActiveDownloads: () => {
				set((state) => {
					const newDownloads = new Map<string, DownloadInfo>();

					for (const [trackId, info] of state.downloads) {
						if (info.status === 'completed') {
							newDownloads.set(trackId, info);
						}
					}
					return { downloads: newDownloads };
				});
			},

			clearAll: () => {
				set({
					downloads: new Map(),
					downloadedTracks: new Map(),
				});
			},

			isDownloaded: (trackId: string) => {
				return get().downloadedTracks.has(trackId);
			},

			isDownloading: (trackId: string) => {
				const info = get().downloads.get(trackId);
				return info?.status === 'pending' || info?.status === 'downloading';
			},

			getDownloadInfo: (trackId: string) => {
				return get().downloads.get(trackId);
			},

			getDownloadedTrack: (trackId: string) => {
				return get().downloadedTracks.get(trackId);
			},

			getLocalFilePath: (trackId: string) => {
				const metadata = get().downloadedTracks.get(trackId);
				return metadata?.filePath ?? null;
			},

			getAllDownloadedTracks: () => {
				return Array.from(get().downloadedTracks.values());
			},

			getActiveDownloadsCount: () => {
				let count = 0;
				for (const info of get().downloads.values()) {
					if (info.status === 'pending' || info.status === 'downloading') {
						count++;
					}
				}
				return count;
			},
		}),
		{
			name: 'aria-downloads-storage',
			storage: createJSONStorage(() => customStorage),

			partialize: (state) => ({
				downloadedTracks: Array.from(state.downloadedTracks.entries()),
			}),

			onRehydrateStorage: () => (state) => {
				if (state) {
					const entries = state.downloadedTracks as unknown as [
						string,
						DownloadedTrackMetadata,
					][];
					const downloadedTracksMap = new Map(entries);
					state.downloadedTracks = downloadedTracksMap;

					const downloadsMap = new Map<string, DownloadInfo>();
					for (const [trackId, metadata] of downloadedTracksMap) {
						const pending = createPendingDownload(trackId, {
							title: metadata.title,
							artistName: metadata.artistName,
							artworkUrl: metadata.artworkUrl,
						});
						downloadsMap.set(
							trackId,
							createCompletedDownload(pending, metadata.filePath, metadata.fileSize)
						);
					}
					state.downloads = downloadsMap;
				}
			},
		}
	)
);

export const useDownloads = () => useDownloadStore((state) => state.downloads);
export const useDownloadedTracks = () => useDownloadStore((state) => state.downloadedTracks);
export const useIsDownloaded = (trackId: string) =>
	useDownloadStore((state) => state.isDownloaded(trackId));
export const useIsDownloading = (trackId: string) =>
	useDownloadStore((state) => state.isDownloading(trackId));
export const useDownloadInfo = (trackId: string) =>
	useDownloadStore((state) => state.getDownloadInfo(trackId));
export const useDownloadProgress = (trackId: string) =>
	useDownloadStore((state) => state.getDownloadInfo(trackId)?.progress ?? 0);
export const useActiveDownloadsCount = () =>
	useDownloadStore((state) => state.getActiveDownloadsCount());

interface DownloadStats {
	readonly activeCount: number;
	readonly completedCount: number;
	readonly failedCount: number;
	readonly pendingCount: number;
	readonly totalSize: number;
}

function activeDownloadsSelector(state: DownloadState): DownloadInfo[] {
	const result: DownloadInfo[] = [];
	for (const info of state.downloads.values()) {
		if (info.status === 'pending' || info.status === 'downloading') {
			result.push(info);
		}
	}
	return result;
}

function activeDownloadsEqual(a: DownloadInfo[], b: DownloadInfo[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (
			a[i].trackId !== b[i].trackId ||
			a[i].status !== b[i].status ||
			a[i].progress !== b[i].progress
		)
			return false;
	}
	return true;
}

export function useActiveDownloadsList(): DownloadInfo[] {
	return useStoreWithEqualityFn(useDownloadStore, activeDownloadsSelector, activeDownloadsEqual);
}

function completedDownloadsSelector(state: DownloadState): DownloadInfo[] {
	const result: DownloadInfo[] = [];
	for (const info of state.downloads.values()) {
		if (info.status === 'completed') {
			result.push(info);
		}
	}
	return result;
}

function completedDownloadsEqual(a: DownloadInfo[], b: DownloadInfo[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i].trackId !== b[i].trackId) return false;
	}
	return true;
}

export function useCompletedDownloadsList(): DownloadInfo[] {
	return useStoreWithEqualityFn(
		useDownloadStore,
		completedDownloadsSelector,
		completedDownloadsEqual
	);
}

function failedDownloadsSelector(state: DownloadState): DownloadInfo[] {
	const result: DownloadInfo[] = [];
	for (const info of state.downloads.values()) {
		if (info.status === 'failed') {
			result.push(info);
		}
	}
	return result;
}

function failedDownloadsEqual(a: DownloadInfo[], b: DownloadInfo[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i].trackId !== b[i].trackId) return false;
	}
	return true;
}

export function useFailedDownloadsList(): DownloadInfo[] {
	return useStoreWithEqualityFn(useDownloadStore, failedDownloadsSelector, failedDownloadsEqual);
}

function downloadStatsSelector(state: DownloadState): DownloadStats {
	let activeCount = 0;
	let completedCount = 0;
	let failedCount = 0;
	let pendingCount = 0;
	let totalSize = 0;

	for (const info of state.downloads.values()) {
		switch (info.status) {
			case 'pending':
				pendingCount++;
				activeCount++;
				break;
			case 'downloading':
				activeCount++;
				break;
			case 'completed':
				completedCount++;
				if (info.fileSize) totalSize += info.fileSize;
				break;
			case 'failed':
				failedCount++;
				break;
		}
	}

	return { activeCount, completedCount, failedCount, pendingCount, totalSize };
}

function downloadStatsEqual(a: DownloadStats, b: DownloadStats): boolean {
	return (
		a.activeCount === b.activeCount &&
		a.completedCount === b.completedCount &&
		a.failedCount === b.failedCount &&
		a.pendingCount === b.pendingCount &&
		a.totalSize === b.totalSize
	);
}

export function useDownloadStats(): DownloadStats {
	return useStoreWithEqualityFn(useDownloadStore, downloadStatsSelector, downloadStatsEqual);
}
