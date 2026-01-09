import { useMemo } from 'react';
import type { Track } from '@/src/domain/entities/track';
import {
  extractUniqueArtists,
  extractUniqueAlbums,
} from '@/src/domain/utils/track-filtering';

/**
 * Hook that extracts unique artists and albums from tracks
 * for use in filter pickers
 */
export function useUniqueFilterOptions(tracks: readonly Track[]) {
  const artists = useMemo(() => {
    return extractUniqueArtists(tracks);
  }, [tracks]);

  const albums = useMemo(() => {
    return extractUniqueAlbums(tracks);
  }, [tracks]);

  return { artists, albums };
}
