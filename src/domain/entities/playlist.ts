import type { Track } from './track';
import type { Artwork } from '../value-objects/artwork';

export interface PlaylistTrack {
	readonly track: Track;

	readonly addedAt: Date;

	readonly position: number;
}

export interface PlaylistRule {
	readonly field: 'artist' | 'album' | 'genre' | 'year' | 'duration' | 'playCount' | 'addedAt';

	readonly operator:
		| 'equals'
		| 'contains'
		| 'startsWith'
		| 'greaterThan'
		| 'lessThan'
		| 'between';

	readonly value: string | number | [number, number];
}

export interface SmartPlaylistCriteria {
	readonly rules: PlaylistRule[];

	readonly matchAll: boolean;

	readonly limit?: number;

	readonly sortBy?: 'title' | 'artist' | 'album' | 'addedAt' | 'playCount' | 'random';

	readonly sortDirection?: 'asc' | 'desc';
}

export interface Playlist {
	readonly id: string;

	readonly name: string;

	readonly description?: string;

	readonly artwork?: Artwork[];

	readonly tracks: PlaylistTrack[];

	readonly createdAt: Date;

	readonly updatedAt: Date;

	readonly isSmartPlaylist: boolean;

	readonly smartCriteria?: SmartPlaylistCriteria;

	readonly isPinned?: boolean;

	readonly source?: string;
}

export interface CreatePlaylistParams {
	id?: string;
	name: string;
	description?: string;
	artwork?: Artwork[];
	tracks?: Track[];
	isSmartPlaylist?: boolean;
	smartCriteria?: SmartPlaylistCriteria;
}

function generatePlaylistId(): string {
	return `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createPlaylist(params: CreatePlaylistParams): Playlist {
	const now = new Date();

	return Object.freeze({
		id: params.id ?? generatePlaylistId(),
		name: params.name,
		description: params.description,
		artwork: params.artwork,
		tracks: (params.tracks ?? []).map((track, index) => ({
			track,
			addedAt: now,
			position: index,
		})),
		createdAt: now,
		updatedAt: now,
		isSmartPlaylist: params.isSmartPlaylist ?? false,
		smartCriteria: params.smartCriteria,
		isPinned: false,
	});
}

export function addTrackToPlaylist(playlist: Playlist, track: Track): Playlist {
	const newTrack: PlaylistTrack = {
		track,
		addedAt: new Date(),
		position: playlist.tracks.length,
	};

	return {
		...playlist,
		tracks: [...playlist.tracks, newTrack],
		updatedAt: new Date(),
	};
}

export function removeTrackFromPlaylist(playlist: Playlist, position: number): Playlist {
	const newTracks = playlist.tracks
		.filter((t) => t.position !== position)
		.map((t, index) => ({ ...t, position: index }));

	return {
		...playlist,
		tracks: newTracks,
		updatedAt: new Date(),
	};
}

export function reorderPlaylistTracks(
	playlist: Playlist,
	fromIndex: number,
	toIndex: number
): Playlist {
	const tracks = [...playlist.tracks];
	const [moved] = tracks.splice(fromIndex, 1);
	tracks.splice(toIndex, 0, moved);

	const reorderedTracks = tracks.map((t, index) => ({
		...t,
		position: index,
	}));

	return {
		...playlist,
		tracks: reorderedTracks,
		updatedAt: new Date(),
	};
}

export function getPlaylistDuration(playlist: Playlist): number {
	return playlist.tracks.reduce((total, pt) => total + pt.track.duration.totalMilliseconds, 0);
}

export function getPlaylistTrackCount(playlist: Playlist): number {
	return playlist.tracks.length;
}
