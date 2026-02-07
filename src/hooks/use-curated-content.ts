import { useMemo } from 'react';
import { useRecentlyPlayed, useHasHistory } from '@/src/application/state/history-store';
import {
	useFavoriteTracks,
	useRecentlyAddedTracks,
	useTracks,
} from '@/src/application/state/library-store';
import type { Track } from '@/src/domain/entities/track';

interface CuratedContent {
	readonly recentlyPlayed: Track[];
	readonly favoriteTracks: Track[];
	readonly recentlyAdded: Track[];
	readonly hasCuratedContent: boolean;
}

export function useCuratedContent(limit = 10): CuratedContent {
	const recentlyPlayedHistory = useRecentlyPlayed(limit);
	const allTracks = useTracks();
	const favoriteTracks = useFavoriteTracks();
	const recentlyAdded = useRecentlyAddedTracks(limit);
	const hasHistory = useHasHistory();

	const recentlyPlayed = useMemo(() => {
		const trackMap = new Map(allTracks.map((t) => [t.id.value, t]));
		return recentlyPlayedHistory.map((t) => trackMap.get(t.id.value) ?? t);
	}, [recentlyPlayedHistory, allTracks]);

	const hasCuratedContent = hasHistory || favoriteTracks.length > 0 || recentlyAdded.length > 0;

	return { recentlyPlayed, favoriteTracks, recentlyAdded, hasCuratedContent };
}
