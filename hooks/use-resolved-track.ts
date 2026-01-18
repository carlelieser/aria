import { useMemo } from 'react';
import type { Track } from '@/src/domain/entities/track';
import { useLibraryStore } from '@/src/application/state/library-store';
import { useHistoryStore } from '@/src/application/state/history-store';
import { getTrackIdString } from '@/src/domain/value-objects/track-id';

export function useResolvedTrack(trackId: string): Track | null {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const historyEntries = useHistoryStore((state) => state.recentlyPlayed);

	return useMemo(() => {
		const libraryTrack = libraryTracks.find((t) => getTrackIdString(t.id) === trackId);
		if (libraryTrack) {
			return libraryTrack;
		}

		const historyEntry = historyEntries.find(
			(entry) => getTrackIdString(entry.track.id) === trackId
		);
		if (historyEntry) {
			return historyEntry.track;
		}

		return null;
	}, [trackId, libraryTracks, historyEntries]);
}

export function useResolvedTrackWithFallback(fallbackTrack: Track): Track {
	const trackId = getTrackIdString(fallbackTrack.id);
	const resolvedTrack = useResolvedTrack(trackId);

	return resolvedTrack ?? fallbackTrack;
}

export function useResolvedTracks(trackIds: string[]): Map<string, Track> {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const historyEntries = useHistoryStore((state) => state.recentlyPlayed);

	return useMemo(() => {
		const result = new Map<string, Track>();
		const idsToFind = new Set(trackIds);

		for (const track of libraryTracks) {
			const id = getTrackIdString(track.id);
			if (idsToFind.has(id)) {
				result.set(id, track);
				idsToFind.delete(id);
			}
		}

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
