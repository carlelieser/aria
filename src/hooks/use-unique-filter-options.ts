import { useMemo } from 'react';
import type { Track } from '@/src/domain/entities/track';
import {
	extractUniqueArtistsFromItems,
	extractUniqueAlbumsFromItems,
} from '@/src/domain/utils/core-filtering';

export function useUniqueFilterOptions(tracks: readonly Track[]) {
	const artists = useMemo(() => {
		return extractUniqueArtistsFromItems(tracks);
	}, [tracks]);

	const albums = useMemo(() => {
		return extractUniqueAlbumsFromItems(tracks);
	}, [tracks]);

	return { artists, albums };
}
