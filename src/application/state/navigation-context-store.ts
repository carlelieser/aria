import { create } from 'zustand';
import type { Track } from '@/src/domain/entities/track';

interface NavigationContextState {
	track: Track | null;

	setTrack: (track: Track) => void;
	clearTrack: () => void;
}

export const useNavigationContextStore = create<NavigationContextState>((set) => ({
	track: null,

	setTrack: (track) => set({ track }),
	clearTrack: () => set({ track: null }),
}));

export const getNavigationTrack = () => useNavigationContextStore.getState().track;
export const setNavigationTrack = (track: Track) =>
	useNavigationContextStore.getState().setTrack(track);
export const clearNavigationTrack = () => useNavigationContextStore.getState().clearTrack();
