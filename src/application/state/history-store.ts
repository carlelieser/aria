import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Track } from '../../domain/entities/track';
import { TrackId, getTrackIdString } from '../../domain/value-objects/track-id';
import { Duration } from '../../domain/value-objects/duration';

/**
 * Rehydrates a track from JSON storage, converting serialized primitives
 * back to proper value object instances (TrackId, Duration).
 */
function rehydrateTrack(serialized: unknown): Track {
	const raw = serialized as Record<string, unknown>;

	const id =
		typeof raw.id === 'string'
			? TrackId.fromString(raw.id)
			: raw.id instanceof TrackId
				? raw.id
				: TrackId.fromString((raw.id as { value: string }).value);

	const duration =
		typeof raw.duration === 'number'
			? Duration.fromMilliseconds(raw.duration)
			: raw.duration instanceof Duration
				? raw.duration
				: Duration.fromMilliseconds(
						(raw.duration as { totalMilliseconds: number }).totalMilliseconds
					);

	return {
		...raw,
		id,
		duration,
	} as Track;
}

interface HistoryEntry {
	track: Track;
	playedAt: number;
}

interface HistoryState {
	recentlyPlayed: HistoryEntry[];

	addToHistory: (track: Track) => void;
	clearHistory: () => void;
	removeFromHistory: (trackId: string) => void;

	getRecentTracks: (limit?: number) => Track[];
}

const MAX_HISTORY_SIZE = 50;

export const useHistoryStore = create<HistoryState>()(
	persist(
		(set, get) => ({
			recentlyPlayed: [],

			addToHistory: (track: Track) => {
				set((state) => {
					const newTrackId = getTrackIdString(track.id);
					const filtered = state.recentlyPlayed.filter(
						(entry) => getTrackIdString(entry.track.id) !== newTrackId
					);

					const newEntry: HistoryEntry = {
						track,
						playedAt: Date.now(),
					};

					const updated = [newEntry, ...filtered];

					return { recentlyPlayed: updated.slice(0, MAX_HISTORY_SIZE) };
				});
			},

			clearHistory: () => {
				set({ recentlyPlayed: [] });
			},

			removeFromHistory: (trackId: string) => {
				set((state) => ({
					recentlyPlayed: state.recentlyPlayed.filter(
						(entry) => getTrackIdString(entry.track.id) !== trackId
					),
				}));
			},

			getRecentTracks: (limit = 10) => {
				const state = get();
				return state.recentlyPlayed.slice(0, limit).map((entry) => entry.track);
			},
		}),
		{
			name: 'aria-history-storage',
			storage: createJSONStorage(() => AsyncStorage),
			onRehydrateStorage: () => (state) => {
				if (state) {
					state.recentlyPlayed = state.recentlyPlayed.map((entry) => ({
						...entry,
						track: rehydrateTrack(entry.track),
					}));
				}
			},
		}
	)
);

/**
 * Memoized selector cache for useRecentlyPlayed.
 * Prevents creating new arrays on every render when underlying data hasn't changed.
 */
const recentlyPlayedCache = new Map<number, { entriesLength: number; tracks: Track[] }>();

export const useRecentlyPlayed = (limit = 10) =>
	useHistoryStore((state) => {
		const cached = recentlyPlayedCache.get(limit);

		// Return cached value if entries haven't changed
		if (cached && cached.entriesLength === state.recentlyPlayed.length) {
			return cached.tracks;
		}

		const seen = new Set<string>();
		const uniqueTracks: Track[] = [];

		for (const entry of state.recentlyPlayed) {
			const trackId = getTrackIdString(entry.track.id);
			if (!seen.has(trackId)) {
				seen.add(trackId);
				uniqueTracks.push(entry.track);
				if (uniqueTracks.length >= limit) break;
			}
		}

		// Cache the result
		recentlyPlayedCache.set(limit, {
			entriesLength: state.recentlyPlayed.length,
			tracks: uniqueTracks,
		});

		return uniqueTracks;
	});

/**
 * Memoized selector cache for useRecentlyPlayedEntries.
 */
const recentlyPlayedEntriesCache = new Map<
	number,
	{ entriesLength: number; entries: HistoryEntry[] }
>();

export const useRecentlyPlayedEntries = (limit = 10) =>
	useHistoryStore((state) => {
		const cached = recentlyPlayedEntriesCache.get(limit);

		// Return cached value if entries haven't changed
		if (cached && cached.entriesLength === state.recentlyPlayed.length) {
			return cached.entries;
		}

		const seen = new Set<string>();
		const uniqueEntries: HistoryEntry[] = [];

		for (const entry of state.recentlyPlayed) {
			const trackId = getTrackIdString(entry.track.id);
			if (!seen.has(trackId)) {
				seen.add(trackId);
				uniqueEntries.push(entry);
				if (uniqueEntries.length >= limit) break;
			}
		}

		// Cache the result
		recentlyPlayedEntriesCache.set(limit, {
			entriesLength: state.recentlyPlayed.length,
			entries: uniqueEntries,
		});

		return uniqueEntries;
	});

export const useHasHistory = () => useHistoryStore((state) => state.recentlyPlayed.length > 0);
