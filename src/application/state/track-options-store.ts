import { create } from 'zustand';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';

interface TrackOptionsState {
	track: Track | null;
	source: TrackActionSource;
	isOpen: boolean;

	open: (track: Track, source: TrackActionSource) => void;
	close: () => void;
}

export const useTrackOptionsStore = create<TrackOptionsState>((set) => ({
	track: null,
	source: 'library',
	isOpen: false,

	open: (track, source) => {
		set({ track, source, isOpen: true });
	},

	close: () => {
		set({ isOpen: false });
	},
}));

export const useTrackOptionsTrack = () =>
	useTrackOptionsStore((state) => state.track);

export const useTrackOptionsSource = () =>
	useTrackOptionsStore((state) => state.source);

export const useIsTrackOptionsOpen = () =>
	useTrackOptionsStore((state) => state.isOpen);

export const useOpenTrackOptions = () =>
	useTrackOptionsStore((state) => state.open);

export const useCloseTrackOptions = () =>
	useTrackOptionsStore((state) => state.close);
