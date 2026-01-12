import type { Track } from '@domain/entities/track';
import type { ArtistReference } from '@domain/entities/artist';
import type { AlbumReference } from '@domain/entities/album';
import type { Artwork } from '@domain/value-objects/artwork';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createStreamingSource } from '@domain/value-objects/audio-source';

const ARTWORK_BASE = 'https://picsum.photos/seed';

function createArtwork(seed: string): Artwork[] {
	return [
		{ url: `${ARTWORK_BASE}/${seed}/640/640`, width: 640, height: 640, size: 'large' },
		{ url: `${ARTWORK_BASE}/${seed}/300/300`, width: 300, height: 300, size: 'medium' },
		{ url: `${ARTWORK_BASE}/${seed}/100/100`, width: 100, height: 100, size: 'small' },
	];
}

interface MockArtist {
	id: string;
	name: string;
}

interface MockAlbum {
	id: string;
	name: string;
	year: number;
	trackCount: number;
}

const ARTISTS: MockArtist[] = [
	{ id: 'artist-001', name: 'Aurora Skies' },
	{ id: 'artist-002', name: 'The Midnight Echo' },
	{ id: 'artist-003', name: 'Crystal Waves' },
	{ id: 'artist-004', name: 'Neon Pulse' },
	{ id: 'artist-005', name: 'Velvet Storm' },
	{ id: 'artist-006', name: 'Solar Flare' },
	{ id: 'artist-007', name: 'Ocean Drive' },
	{ id: 'artist-008', name: 'Stellar Dreams' },
	{ id: 'artist-009', name: 'Echo Valley' },
	{ id: 'artist-010', name: 'Midnight Sun' },
];

const ALBUMS: MockAlbum[] = [
	{ id: 'album-001', name: 'Ethereal Horizons', year: 2024, trackCount: 12 },
	{ id: 'album-002', name: 'Neon Nights', year: 2023, trackCount: 10 },
	{ id: 'album-003', name: 'Ocean Memories', year: 2024, trackCount: 8 },
	{ id: 'album-004', name: 'Digital Dreams', year: 2022, trackCount: 14 },
	{ id: 'album-005', name: 'Starlight Symphony', year: 2024, trackCount: 11 },
	{ id: 'album-006', name: 'Urban Echoes', year: 2023, trackCount: 9 },
	{ id: 'album-007', name: 'Cosmic Journey', year: 2021, trackCount: 13 },
	{ id: 'album-008', name: 'Silent Waves', year: 2024, trackCount: 7 },
	{ id: 'album-009', name: 'Electric Sunset', year: 2023, trackCount: 10 },
	{ id: 'album-010', name: 'Midnight Tales', year: 2022, trackCount: 12 },
];

interface TrackData {
	title: string;
	artistIndex: number;
	albumIndex: number;
	durationSeconds: number;
	trackNumber: number;
	genre: string;
	explicit?: boolean;
	popularity?: number;
}

const TRACK_DATA: TrackData[] = [
	{
		title: 'Dawn of Light',
		artistIndex: 0,
		albumIndex: 0,
		durationSeconds: 234,
		trackNumber: 1,
		genre: 'Electronic',
		popularity: 85,
	},
	{
		title: 'Floating Through Time',
		artistIndex: 0,
		albumIndex: 0,
		durationSeconds: 287,
		trackNumber: 2,
		genre: 'Electronic',
		popularity: 72,
	},
	{
		title: 'Whispers in the Wind',
		artistIndex: 0,
		albumIndex: 0,
		durationSeconds: 198,
		trackNumber: 3,
		genre: 'Ambient',
		popularity: 68,
	},
	{
		title: 'City Lights',
		artistIndex: 1,
		albumIndex: 1,
		durationSeconds: 245,
		trackNumber: 1,
		genre: 'Synthwave',
		popularity: 91,
	},
	{
		title: 'Retrograde',
		artistIndex: 1,
		albumIndex: 1,
		durationSeconds: 312,
		trackNumber: 2,
		genre: 'Synthwave',
		explicit: true,
		popularity: 88,
	},
	{
		title: 'Neon Boulevard',
		artistIndex: 1,
		albumIndex: 1,
		durationSeconds: 267,
		trackNumber: 3,
		genre: 'Synthwave',
		popularity: 79,
	},
	{
		title: 'Tidal Motion',
		artistIndex: 2,
		albumIndex: 2,
		durationSeconds: 423,
		trackNumber: 1,
		genre: 'Chillout',
		popularity: 65,
	},
	{
		title: 'Beneath the Surface',
		artistIndex: 2,
		albumIndex: 2,
		durationSeconds: 356,
		trackNumber: 2,
		genre: 'Chillout',
		popularity: 71,
	},
	{
		title: 'Coral Dreams',
		artistIndex: 2,
		albumIndex: 2,
		durationSeconds: 289,
		trackNumber: 3,
		genre: 'Ambient',
		popularity: 58,
	},
	{
		title: 'Binary Sunset',
		artistIndex: 3,
		albumIndex: 3,
		durationSeconds: 198,
		trackNumber: 1,
		genre: 'Electronic',
		popularity: 82,
	},
	{
		title: 'Data Stream',
		artistIndex: 3,
		albumIndex: 3,
		durationSeconds: 234,
		trackNumber: 2,
		genre: 'Electronic',
		explicit: true,
		popularity: 76,
	},
	{
		title: 'Pixel Hearts',
		artistIndex: 3,
		albumIndex: 3,
		durationSeconds: 267,
		trackNumber: 3,
		genre: 'Electronic',
		popularity: 69,
	},
	{
		title: 'Constellation',
		artistIndex: 4,
		albumIndex: 4,
		durationSeconds: 312,
		trackNumber: 1,
		genre: 'Orchestral',
		popularity: 94,
	},
	{
		title: 'Nebula Dance',
		artistIndex: 4,
		albumIndex: 4,
		durationSeconds: 445,
		trackNumber: 2,
		genre: 'Orchestral',
		popularity: 87,
	},
	{
		title: 'Gravity Well',
		artistIndex: 4,
		albumIndex: 4,
		durationSeconds: 378,
		trackNumber: 3,
		genre: 'Orchestral',
		popularity: 81,
	},
	{
		title: 'Street Symphony',
		artistIndex: 5,
		albumIndex: 5,
		durationSeconds: 223,
		trackNumber: 1,
		genre: 'Hip-Hop',
		explicit: true,
		popularity: 89,
	},
	{
		title: 'Concrete Jungle',
		artistIndex: 5,
		albumIndex: 5,
		durationSeconds: 256,
		trackNumber: 2,
		genre: 'Hip-Hop',
		explicit: true,
		popularity: 85,
	},
	{
		title: 'Skyline Views',
		artistIndex: 5,
		albumIndex: 5,
		durationSeconds: 289,
		trackNumber: 3,
		genre: 'Hip-Hop',
		popularity: 77,
	},
	{
		title: 'Interstellar',
		artistIndex: 6,
		albumIndex: 6,
		durationSeconds: 534,
		trackNumber: 1,
		genre: 'Progressive',
		popularity: 92,
	},
	{
		title: 'Event Horizon',
		artistIndex: 6,
		albumIndex: 6,
		durationSeconds: 467,
		trackNumber: 2,
		genre: 'Progressive',
		popularity: 88,
	},
	{
		title: 'Warp Speed',
		artistIndex: 6,
		albumIndex: 6,
		durationSeconds: 398,
		trackNumber: 3,
		genre: 'Progressive',
		popularity: 79,
	},
	{
		title: 'Calm Waters',
		artistIndex: 7,
		albumIndex: 7,
		durationSeconds: 312,
		trackNumber: 1,
		genre: 'Lo-Fi',
		popularity: 73,
	},
	{
		title: 'Peaceful Mind',
		artistIndex: 7,
		albumIndex: 7,
		durationSeconds: 287,
		trackNumber: 2,
		genre: 'Lo-Fi',
		popularity: 68,
	},
	{
		title: 'Gentle Rain',
		artistIndex: 7,
		albumIndex: 7,
		durationSeconds: 345,
		trackNumber: 3,
		genre: 'Lo-Fi',
		popularity: 71,
	},
	{
		title: 'Golden Hour',
		artistIndex: 8,
		albumIndex: 8,
		durationSeconds: 256,
		trackNumber: 1,
		genre: 'Indie',
		popularity: 86,
	},
	{
		title: 'Fading Light',
		artistIndex: 8,
		albumIndex: 8,
		durationSeconds: 289,
		trackNumber: 2,
		genre: 'Indie',
		popularity: 82,
	},
	{
		title: 'Last Rays',
		artistIndex: 8,
		albumIndex: 8,
		durationSeconds: 312,
		trackNumber: 3,
		genre: 'Indie',
		popularity: 75,
	},
	{
		title: 'After Dark',
		artistIndex: 9,
		albumIndex: 9,
		durationSeconds: 278,
		trackNumber: 1,
		genre: 'Dark Wave',
		popularity: 84,
	},
	{
		title: 'Shadow Dance',
		artistIndex: 9,
		albumIndex: 9,
		durationSeconds: 334,
		trackNumber: 2,
		genre: 'Dark Wave',
		explicit: true,
		popularity: 79,
	},
	{
		title: 'Moonlit Path',
		artistIndex: 9,
		albumIndex: 9,
		durationSeconds: 301,
		trackNumber: 3,
		genre: 'Dark Wave',
		popularity: 72,
	},
];

function createMockTrack(data: TrackData, index: number): Track {
	const artist = ARTISTS[data.artistIndex];
	const album = ALBUMS[data.albumIndex];
	const trackId = `track-${String(index + 1).padStart(3, '0')}`;

	const artistRef: ArtistReference = {
		id: artist.id,
		name: artist.name,
	};

	const albumRef: AlbumReference = {
		id: album.id,
		name: album.name,
	};

	const daysAgo = Math.floor(Math.random() * 90);
	const addedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

	return {
		id: TrackId.create('youtube-music', trackId),
		title: data.title,
		artists: [artistRef],
		album: albumRef,
		duration: Duration.fromSeconds(data.durationSeconds),
		artwork: createArtwork(`${album.id}-${data.trackNumber}`),
		source: createStreamingSource('youtube-music', trackId),
		metadata: {
			genre: data.genre,
			year: album.year,
			trackNumber: data.trackNumber,
			explicit: data.explicit,
			popularity: data.popularity,
		},
		addedAt,
		playCount: Math.floor(Math.random() * 50),
		isFavorite: false,
	};
}

export const MOCK_TRACKS: Track[] = TRACK_DATA.map((data, index) => createMockTrack(data, index));

export const MOCK_ARTISTS = ARTISTS;
export const MOCK_ALBUMS = ALBUMS;

export function getTracksByArtist(artistId: string): Track[] {
	return MOCK_TRACKS.filter((track) => track.artists.some((a) => a.id === artistId));
}

export function getTracksByAlbum(albumId: string): Track[] {
	return MOCK_TRACKS.filter((track) => track.album?.id === albumId);
}
