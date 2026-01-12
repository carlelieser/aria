import { create } from 'zustand';
import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';
import type { Artist } from '../../domain/entities/artist';

interface ArtistDetail {
	artist: Artist | null;
	topTracks: Track[];
	albums: Album[];
	isLoading: boolean;
	error: string | null;
}

interface ArtistState {
	artists: Map<string, ArtistDetail>;

	setLoading: (artistId: string, isLoading: boolean) => void;
	setArtistDetail: (
		artistId: string,
		artist: Artist | null,
		topTracks: Track[],
		albums: Album[]
	) => void;
	setError: (artistId: string, error: string | null) => void;
	clearArtist: (artistId: string) => void;
	clearAll: () => void;
}

function createEmptyDetail(): ArtistDetail {
	return {
		artist: null,
		topTracks: [],
		albums: [],
		isLoading: false,
		error: null,
	};
}

const EMPTY_DETAIL: ArtistDetail = createEmptyDetail();
const EMPTY_TRACKS: readonly Track[] = [];
const EMPTY_ALBUMS: readonly Album[] = [];

export const useArtistStore = create<ArtistState>((set) => ({
	artists: new Map(),

	setLoading: (artistId: string, isLoading: boolean) => {
		set((state) => {
			const artists = new Map(state.artists);
			const existing = artists.get(artistId) ?? createEmptyDetail();
			artists.set(artistId, { ...existing, isLoading, error: null });
			return { artists };
		});
	},

	setArtistDetail: (
		artistId: string,
		artist: Artist | null,
		topTracks: Track[],
		albums: Album[]
	) => {
		set((state) => {
			const artists = new Map(state.artists);
			artists.set(artistId, {
				artist,
				topTracks,
				albums,
				isLoading: false,
				error: null,
			});
			return { artists };
		});
	},

	setError: (artistId: string, error: string | null) => {
		set((state) => {
			const artists = new Map(state.artists);
			const existing = artists.get(artistId) ?? createEmptyDetail();
			artists.set(artistId, { ...existing, error, isLoading: false });
			return { artists };
		});
	},

	clearArtist: (artistId: string) => {
		set((state) => {
			const artists = new Map(state.artists);
			artists.delete(artistId);
			return { artists };
		});
	},

	clearAll: () => {
		set({ artists: new Map() });
	},
}));

export function useArtistDetail(artistId: string): ArtistDetail {
	return useArtistStore((state) => state.artists.get(artistId) ?? EMPTY_DETAIL);
}

export function useArtistTopTracks(artistId: string): readonly Track[] {
	return useArtistStore((state) => state.artists.get(artistId)?.topTracks ?? EMPTY_TRACKS);
}

export function useArtistAlbums(artistId: string): readonly Album[] {
	return useArtistStore((state) => state.artists.get(artistId)?.albums ?? EMPTY_ALBUMS);
}

export function useArtistLoading(artistId: string): boolean {
	return useArtistStore((state) => state.artists.get(artistId)?.isLoading ?? false);
}

export function useArtistError(artistId: string): string | null {
	return useArtistStore((state) => state.artists.get(artistId)?.error ?? null);
}
