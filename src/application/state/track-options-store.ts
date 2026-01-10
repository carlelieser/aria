import { create } from 'zustand';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';

interface TrackOptionsContext {
	playlistId?: string;
	trackPosition?: number;
}

interface TrackOptionsState {
	track: Track | null;
	source: TrackActionSource;
	context: TrackOptionsContext;
	isOpen: boolean;

	open: (track: Track, source: TrackActionSource, context?: TrackOptionsContext) => void;
	close: () => void;
}

export const useTrackOptionsStore = create<TrackOptionsState>((set) => ({
	track: null,
	source: 'library',
	context: {},
	isOpen: false,

	open: (track, source, context = {}) => {
		set({ track, source, context, isOpen: true });
	},

	close: () => {
		set({ isOpen: false, context: {} });
	},
}));

export const useTrackOptionsTrack = () => useTrackOptionsStore((state) => state.track);

export const useTrackOptionsSource = () => useTrackOptionsStore((state) => state.source);

export const useTrackOptionsContext = () => useTrackOptionsStore((state) => state.context);

export const useIsTrackOptionsOpen = () => useTrackOptionsStore((state) => state.isOpen);

export const useOpenTrackOptions = () => useTrackOptionsStore((state) => state.open);

export const useCloseTrackOptions = () => useTrackOptionsStore((state) => state.close);

export type { TrackOptionsContext };
