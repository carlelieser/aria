import { getArtworkUrl, getArtistNames, type Track } from '@/src/domain/entities/track';
import type { Artwork } from '@/src/domain/value-objects/artwork';

export function enrichTracksWithAlbumArtwork(tracks: Track[], albumArtworkUrl?: string): Track[] {
	if (!albumArtworkUrl) return tracks;

	const fallbackArtwork: Artwork[] = [{ url: albumArtworkUrl }];

	return tracks.map((track) => {
		if (track.artwork && track.artwork.length > 0) {
			return track;
		}
		return { ...track, artwork: fallbackArtwork };
	});
}

export function getAlbumInfo(tracks: Track[], albumId: string, fallbackName?: string) {
	const trackWithAlbum = tracks.find((t) => t.album?.id === albumId);
	return {
		name: trackWithAlbum?.album?.name ?? fallbackName ?? 'Unknown Album',
		artists: trackWithAlbum ? getArtistNames(trackWithAlbum) : 'Unknown Artist',
		artwork: trackWithAlbum ? getArtworkUrl(trackWithAlbum, 300) : undefined,
	};
}
