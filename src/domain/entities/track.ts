import type { ArtistReference } from './artist';
import type { AlbumReference } from './album';
import type { TrackId } from '../value-objects/track-id';
import type { Duration } from '../value-objects/duration';
import type { Artwork } from '../value-objects/artwork';
import type { AudioSource } from '../value-objects/audio-source';

export interface TrackMetadata {
	readonly genre?: string;

	readonly year?: number;

	readonly trackNumber?: number;

	readonly discNumber?: number;

	readonly bpm?: number;

	readonly bitrate?: number;

	readonly sampleRate?: number;

	readonly isrc?: string;

	readonly explicit?: boolean;

	readonly popularity?: number;
}

export interface Track {
	readonly id: TrackId;

	readonly title: string;

	readonly artists: ArtistReference[];

	readonly album?: AlbumReference;

	readonly duration: Duration;

	readonly artwork?: Artwork[];

	readonly source: AudioSource;

	readonly metadata: TrackMetadata;

	readonly addedAt?: Date;

	readonly playCount?: number;

	readonly isFavorite?: boolean;
}

export interface CreateTrackParams {
	id: TrackId;
	title: string;
	artists: ArtistReference[];
	album?: AlbumReference;
	duration: Duration;
	artwork?: Artwork[];
	source: AudioSource;
	metadata?: Partial<TrackMetadata>;
}

export function createTrack(params: CreateTrackParams): Track {
	return Object.freeze({
		id: params.id,
		title: params.title,
		artists: params.artists,
		album: params.album,
		duration: params.duration,
		artwork: params.artwork,
		source: params.source,
		metadata: params.metadata ?? {},
		addedAt: undefined,
		playCount: 0,
		isFavorite: false,
	});
}

export function getPrimaryArtist(track: Track): string {
	return track.artists[0]?.name ?? 'Unknown Artist';
}

export function getArtistNames(track: Track): string {
	if (track.artists.length === 0) return 'Unknown Artist';
	return track.artists.map((a) => a.name).join(', ');
}

export function getArtworkUrl(track: Track, preferredSize?: number): string | undefined {
	if (!track.artwork || track.artwork.length === 0) {
		return undefined;
	}

	if (preferredSize === undefined) {
		return track.artwork.reduce((best, current) => {
			const bestSize = (best.width ?? 0) * (best.height ?? 0);
			const currentSize = (current.width ?? 0) * (current.height ?? 0);
			return currentSize > bestSize ? current : best;
		}).url;
	}

	return track.artwork.reduce((best, current) => {
		const bestDiff = Math.abs((best.width ?? 0) - preferredSize);
		const currentDiff = Math.abs((current.width ?? 0) - preferredSize);
		return currentDiff < bestDiff ? current : best;
	}).url;
}
