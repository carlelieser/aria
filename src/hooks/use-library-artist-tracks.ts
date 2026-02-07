import { useTracks } from '@/src/application/state/library-store';
import type { Track } from '@/src/domain/entities/track';

export function useLibraryArtistTracks(artistId: string): Track[] {
	const tracks = useTracks();
	return tracks.filter((track) => track.artists.some((artist) => artist.id === artistId));
}
