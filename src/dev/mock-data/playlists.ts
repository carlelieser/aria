import type { Playlist, PlaylistTrack } from '@domain/entities/playlist';
import type { Artwork } from '@domain/value-objects/artwork';
import { MOCK_TRACKS } from './tracks';

const ARTWORK_BASE = 'https://picsum.photos/seed';

function createArtwork(seed: string): Artwork[] {
	return [
		{ url: `${ARTWORK_BASE}/${seed}/640/640`, width: 640, height: 640, size: 'large' },
		{ url: `${ARTWORK_BASE}/${seed}/300/300`, width: 300, height: 300, size: 'medium' },
		{ url: `${ARTWORK_BASE}/${seed}/100/100`, width: 100, height: 100, size: 'small' },
	];
}

function createPlaylistTracks(trackIndices: number[]): PlaylistTrack[] {
	const baseDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

	return trackIndices.map((index, position) => ({
		track: MOCK_TRACKS[index],
		addedAt: new Date(baseDate.getTime() + position * 24 * 60 * 60 * 1000),
		position,
	}));
}

interface PlaylistDefinition {
	id: string;
	name: string;
	description?: string;
	trackIndices: number[];
	isPinned?: boolean;
}

const PLAYLIST_DEFINITIONS: PlaylistDefinition[] = [
	{
		id: 'playlist-001',
		name: 'Chill Vibes',
		description: 'Perfect tracks for relaxation and unwinding',
		trackIndices: [6, 7, 8, 21, 22, 23],
		isPinned: true,
	},
	{
		id: 'playlist-002',
		name: 'Workout Energy',
		description: 'High energy tracks to power your workout',
		trackIndices: [3, 4, 5, 9, 10, 11, 15, 16, 17],
	},
	{
		id: 'playlist-003',
		name: 'Late Night',
		description: 'Atmospheric sounds for the evening hours',
		trackIndices: [27, 28, 29, 0, 1, 2],
		isPinned: true,
	},
	{
		id: 'playlist-004',
		name: 'Focus Flow',
		description: 'Instrumental tracks for deep concentration',
		trackIndices: [12, 13, 14, 18, 19, 20],
	},
	{
		id: 'playlist-005',
		name: 'Driving Mix',
		description: 'The perfect road trip companion',
		trackIndices: [3, 4, 5, 24, 25, 26, 27, 28],
	},
	{
		id: 'playlist-006',
		name: 'Favorites 2024',
		description: 'My top picks from this year',
		trackIndices: [0, 3, 12, 18, 24],
		isPinned: true,
	},
];

function createPlaylist(definition: PlaylistDefinition): Playlist {
	const createdAt = new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000);
	const updatedAt = new Date(
		createdAt.getTime() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
	);

	return {
		id: definition.id,
		name: definition.name,
		description: definition.description,
		artwork: createArtwork(`playlist-${definition.id}`),
		tracks: createPlaylistTracks(definition.trackIndices),
		createdAt,
		updatedAt,
		isSmartPlaylist: false,
		isPinned: definition.isPinned ?? false,
	};
}

export const MOCK_PLAYLISTS: Playlist[] = PLAYLIST_DEFINITIONS.map(createPlaylist);
