import { create } from 'zustand';
import type { Track } from '@/src/domain/entities/track';
import type { TrackAction, TrackActionSource } from '@/src/domain/actions/track-action';
import { trackActionsService } from '@/src/application/services/track-actions-service';

interface TrackOptionsContext {
	playlistId?: string;
	trackPosition?: number;
}

interface TrackOptionsState {
	track: Track | null;
	source: TrackActionSource;
	context: TrackOptionsContext;
	isOpen: boolean;
	actions: TrackAction[];
	isLoadingActions: boolean;

	open: (track: Track, source: TrackActionSource, context?: TrackOptionsContext) => void;
	close: () => void;
	refreshActions: () => Promise<void>;
}

export const useTrackOptionsStore = create<TrackOptionsState>((set, get) => ({
	track: null,
	source: 'library',
	context: {},
	isOpen: false,
	actions: [],
	isLoadingActions: false,

	open: async (track, source, context = {}) => {
		set({ track, source, context, isLoadingActions: true });

		const actions = await trackActionsService.getActionsForTrack({
			track,
			source,
			playlistId: context.playlistId,
			trackPosition: context.trackPosition,
		});

		set({ actions, isLoadingActions: false, isOpen: true });
	},

	close: () => {
		set({ isOpen: false, context: {}, actions: [] });
	},

	refreshActions: async () => {
		const { track, source, context, isOpen } = get();
		if (!track || !isOpen) return;

		const actions = await trackActionsService.getActionsForTrack({
			track,
			source,
			playlistId: context.playlistId,
			trackPosition: context.trackPosition,
		});

		set({ actions });
	},
}));

export const useTrackOptionsTrack = () => useTrackOptionsStore((state) => state.track);

export const useTrackOptionsSource = () => useTrackOptionsStore((state) => state.source);

export const useTrackOptionsContext = () => useTrackOptionsStore((state) => state.context);

export const useIsTrackOptionsOpen = () => useTrackOptionsStore((state) => state.isOpen);

export const useOpenTrackOptions = () => useTrackOptionsStore((state) => state.open);

export const useCloseTrackOptions = () => useTrackOptionsStore((state) => state.close);

export const useTrackOptionsActions = () => useTrackOptionsStore((state) => state.actions);

export const useRefreshTrackOptionsActions = () =>
	useTrackOptionsStore((state) => state.refreshActions);

export type { TrackOptionsContext };
