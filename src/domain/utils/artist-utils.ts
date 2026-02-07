import type { Track } from '@/src/domain/entities/track';

export function getArtistName(tracks: Track[], artistId: string, fallbackName?: string): string {
	for (const track of tracks) {
		const artist = track.artists.find((a) => a.id === artistId);
		if (artist) return artist.name;
	}
	return fallbackName ?? 'Unknown Artist';
}
