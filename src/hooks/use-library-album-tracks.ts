import { useTracks } from '@/src/application/state/library-store';
import type { Track } from '@/src/domain/entities/track';

export function useLibraryAlbumTracks(albumId: string): Track[] {
	const tracks = useTracks();
	return tracks
		.filter((track) => track.album?.id === albumId)
		.sort((a, b) => {
			const trackNumA = a.metadata.trackNumber ?? 0;
			const trackNumB = b.metadata.trackNumber ?? 0;
			return trackNumA - trackNumB;
		});
}
