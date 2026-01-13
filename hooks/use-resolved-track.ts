import { useMemo } from 'react';
import type { Track } from '@/src/domain/entities/track';
import { useLibraryStore } from '@/src/application/state/library-store';
import { useHistoryStore } from '@/src/application/state/history-store';
import { getTrackIdString } from '@/src/domain/value-objects/track-id';

/**
 * Resolves full track data from available sources (library, history).
 * Returns the track with complete metadata including duration if found,
 * otherwise returns null.
 *
 * Sources are checked in priority order:
 * 1. Library - tracks that have been added to the user's library
 * 2. History - recently played tracks that may have full metadata
 *
 * @param trackId - The track ID string to resolve
 * @returns The resolved track with full metadata, or null if not found
 */
export function useResolvedTrack(trackId: string): Track | null {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const historyEntries = useHistoryStore((state) => state.recentlyPlayed);

	return useMemo(() => {
		// Try library first
		const libraryTrack = libraryTracks.find((t) => getTrackIdString(t.id) === trackId);
		if (libraryTrack) {
			return libraryTrack;
		}

		// Try history
		const historyEntry = historyEntries.find(
			(entry) => getTrackIdString(entry.track.id) === trackId
		);
		if (historyEntry) {
			return historyEntry.track;
		}

		return null;
	}, [trackId, libraryTracks, historyEntries]);
}

/**
 * Resolves full track data and merges it with a fallback track.
 * If full track data is found, returns it. Otherwise returns the fallback.
 * This is useful when you have partial track data (from downloads) but want
 * to use full metadata when available.
 *
 * @param fallbackTrack - The track with partial data to use as fallback
 * @returns The resolved track with full metadata, or the fallback track
 */
export function useResolvedTrackWithFallback(fallbackTrack: Track): Track {
	const trackId = getTrackIdString(fallbackTrack.id);
	const resolvedTrack = useResolvedTrack(trackId);

	return resolvedTrack ?? fallbackTrack;
}

/**
 * Batch resolve multiple tracks from available sources.
 * More efficient than calling useResolvedTrack multiple times
 * as it shares the same library/history lookups.
 *
 * @param trackIds - Array of track ID strings to resolve
 * @returns Map of trackId to resolved Track (only includes found tracks)
 */
export function useResolvedTracks(trackIds: string[]): Map<string, Track> {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const historyEntries = useHistoryStore((state) => state.recentlyPlayed);

	return useMemo(() => {
		const result = new Map<string, Track>();
		const idsToFind = new Set(trackIds);

		// Build library lookup
		for (const track of libraryTracks) {
			const id = getTrackIdString(track.id);
			if (idsToFind.has(id)) {
				result.set(id, track);
				idsToFind.delete(id);
			}
		}

		// Build history lookup for remaining IDs
		for (const entry of historyEntries) {
			const id = getTrackIdString(entry.track.id);
			if (idsToFind.has(id)) {
				result.set(id, entry.track);
				idsToFind.delete(id);
			}
		}

		return result;
	}, [trackIds, libraryTracks, historyEntries]);
}
