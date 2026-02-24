import { useMemo } from 'react';
import type { Track } from '@/src/domain/entities/track';
import { getSourceDisplayName } from '@/src/domain/entities/track';
import {
	extractUniqueArtistsFromItems,
	extractUniqueAlbumsFromItems,
	extractUniqueProvidersFromItems,
} from '@/src/domain/utils/core-filtering';

export interface ProviderFilterOption {
	readonly id: string;
	readonly name: string;
}

export function useUniqueFilterOptions(tracks: readonly Track[]) {
	const artists = useMemo(() => {
		return extractUniqueArtistsFromItems(tracks);
	}, [tracks]);

	const albums = useMemo(() => {
		return extractUniqueAlbumsFromItems(tracks);
	}, [tracks]);

	const providers = useMemo((): ProviderFilterOption[] => {
		const sourceTypes = extractUniqueProvidersFromItems(tracks);
		return sourceTypes.map((sourceType) => ({
			id: sourceType,
			name: getSourceDisplayName({ id: { sourceType } } as Track),
		}));
	}, [tracks]);

	return { artists, albums, providers };
}
