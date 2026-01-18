import { create } from 'zustand';
import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';

interface AlbumDetail {
	album: Album | null;
	tracks: Track[];
	isLoading: boolean;
	error: string | null;
}

interface AlbumState {
	albums: Map<string, AlbumDetail>;

	setLoading: (albumId: string, isLoading: boolean) => void;
	setAlbumDetail: (albumId: string, album: Album | null, tracks: Track[]) => void;
	setAlbumPreview: (album: Album) => void;
	setError: (albumId: string, error: string | null) => void;
	clearAlbum: (albumId: string) => void;
	clearAll: () => void;
}

function createEmptyDetail(): AlbumDetail {
	return {
		album: null,
		tracks: [],
		isLoading: false,
		error: null,
	};
}

const EMPTY_DETAIL: AlbumDetail = createEmptyDetail();
const EMPTY_TRACKS: readonly Track[] = [];

export const useAlbumStore = create<AlbumState>((set) => ({
	albums: new Map(),

	setLoading: (albumId: string, isLoading: boolean) => {
		set((state) => {
			const albums = new Map(state.albums);
			const existing = albums.get(albumId) ?? createEmptyDetail();
			albums.set(albumId, { ...existing, isLoading, error: null });
			return { albums };
		});
	},

	setAlbumDetail: (albumId: string, album: Album | null, tracks: Track[]) => {
		set((state) => {
			const albums = new Map(state.albums);
			albums.set(albumId, {
				album,
				tracks,
				isLoading: false,
				error: null,
			});
			return { albums };
		});
	},

	setAlbumPreview: (album: Album) => {
		set((state) => {
			const albumId = album.id.value;
			const existing = state.albums.get(albumId);
			// Don't overwrite if we already have full data with tracks
			if (existing?.tracks && existing.tracks.length > 0) {
				return state;
			}
			const albums = new Map(state.albums);
			albums.set(albumId, {
				album,
				tracks: existing?.tracks ?? [],
				isLoading: existing?.isLoading ?? false,
				error: null,
			});
			return { albums };
		});
	},

	setError: (albumId: string, error: string | null) => {
		set((state) => {
			const albums = new Map(state.albums);
			const existing = albums.get(albumId) ?? createEmptyDetail();
			albums.set(albumId, { ...existing, error, isLoading: false });
			return { albums };
		});
	},

	clearAlbum: (albumId: string) => {
		set((state) => {
			const albums = new Map(state.albums);
			albums.delete(albumId);
			return { albums };
		});
	},

	clearAll: () => {
		set({ albums: new Map() });
	},
}));

export function useAlbumDetail(albumId: string): AlbumDetail {
	return useAlbumStore((state) => state.albums.get(albumId) ?? EMPTY_DETAIL);
}

export function useAlbumTracks(albumId: string): readonly Track[] {
	return useAlbumStore((state) => state.albums.get(albumId)?.tracks ?? EMPTY_TRACKS);
}

export function useAlbumLoading(albumId: string): boolean {
	return useAlbumStore((state) => state.albums.get(albumId)?.isLoading ?? false);
}

export function useAlbumError(albumId: string): string | null {
	return useAlbumStore((state) => state.albums.get(albumId)?.error ?? null);
}
