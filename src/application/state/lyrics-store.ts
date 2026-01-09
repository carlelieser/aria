import { create } from 'zustand';
import type { Lyrics } from '../../plugins/core/interfaces/metadata-provider';
import type { TrackId } from '../../domain/value-objects/track-id';

interface LyricsState {
	lyrics: Lyrics | null;
	currentLineIndex: number;
	isLoading: boolean;
	error: string | null;
	trackId: TrackId | null;
	isExpanded: boolean;

	setLyrics: (lyrics: Lyrics | null, trackId: TrackId) => void;
	setCurrentLineIndex: (index: number) => void;
	setLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
	setExpanded: (isExpanded: boolean) => void;
	toggleExpanded: () => void;
	clear: () => void;
}

export const useLyricsStore = create<LyricsState>((set, get) => ({
	lyrics: null,
	currentLineIndex: -1,
	isLoading: false,
	error: null,
	trackId: null,
	isExpanded: false,

	setLyrics: (lyrics: Lyrics | null, trackId: TrackId) => {
		set({
			lyrics,
			trackId,
			currentLineIndex: -1,
			error: null,
			isLoading: false,
		});
	},

	setCurrentLineIndex: (index: number) => {
		const state = get();
		if (state.currentLineIndex !== index) {
			set({ currentLineIndex: index });
		}
	},

	setLoading: (isLoading: boolean) => {
		set({ isLoading });
	},

	setError: (error: string | null) => {
		set({ error, isLoading: false });
	},

	setExpanded: (isExpanded: boolean) => {
		set({ isExpanded });
	},

	toggleExpanded: () => {
		set((state) => ({ isExpanded: !state.isExpanded }));
	},

	clear: () => {
		set({
			lyrics: null,
			currentLineIndex: -1,
			isLoading: false,
			error: null,
			trackId: null,
		});
	},
}));

export const useLyricsExpanded = () => useLyricsStore((state) => state.isExpanded);
export const useCurrentLyrics = () => useLyricsStore((state) => state.lyrics);
export const useCurrentLineIndex = () => useLyricsStore((state) => state.currentLineIndex);
export const useLyricsLoading = () => useLyricsStore((state) => state.isLoading);
export const useHasLyrics = () =>
	useLyricsStore((state) => {
		const lyrics = state.lyrics;
		return lyrics !== null && (!!lyrics.syncedLyrics?.length || !!lyrics.plainLyrics);
	});
