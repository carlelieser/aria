import type { Track, CreateTrackParams } from '@domain/entities/track';
import type { Artist, ArtistReference } from '@domain/entities/artist';
import type { Playlist, PlaylistTrack } from '@domain/entities/playlist';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import type { Artwork } from '@domain/value-objects/artwork';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import { createTrack } from '@domain/entities/track';
import { mapAndFilter, mapAndFilterWithIndex } from '@shared/mappers';
import type { SoundCloudTrack, SoundCloudUser, SoundCloudPlaylist, SoundCloudLike } from './types';

/**
 * Extracts the numeric ID from a SoundCloud URN.
 * e.g. "soundcloud:tracks:123456" -> "123456"
 */
export function extractIdFromUrn(urn: string): string {
	const parts = urn.split(':');
	return parts[parts.length - 1];
}

function mapSoundCloudArtwork(artworkUrl: string | null, fallbackUrl?: string): Artwork[] {
	const url = artworkUrl ?? fallbackUrl;
	if (!url) return [];

	return [
		{ url: url.replace(/-large\b/, '-t500x500'), width: 500, height: 500 },
		{ url: url.replace(/-large\b/, '-t200x200'), width: 200, height: 200 },
		{ url, width: 100, height: 100 },
	];
}

export function mapSoundCloudArtistReference(user: SoundCloudUser): ArtistReference {
	return {
		id: `soundcloud:${extractIdFromUrn(user.urn)}`,
		name: user.username,
	};
}

export function mapSoundCloudTrack(track: SoundCloudTrack): Track | null {
	if (!track.urn || !track.title) return null;

	const sourceId = extractIdFromUrn(track.urn);
	const trackId = TrackId.create('soundcloud', sourceId);
	const duration = Duration.fromMilliseconds(track.duration);
	const artwork = mapSoundCloudArtwork(track.artwork_url, track.user?.avatar_url);

	const params: CreateTrackParams = {
		id: trackId,
		title: track.title,
		artists: [mapSoundCloudArtistReference(track.user)],
		duration,
		artwork: artwork.length > 0 ? artwork : undefined,
		source: createStreamingSource('soundcloud', sourceId),
		metadata: {
			genre: track.genre ?? undefined,
			year: extractYearFromIsoString(track.created_at),
			popularity: track.playback_count,
			isrc: track.publisher_metadata?.isrc ?? undefined,
		},
	};

	if (track.publisher_metadata?.album_title) {
		params.album = {
			id: `soundcloud-album:${sourceId}`,
			name: track.publisher_metadata.album_title,
		};
	}

	return createTrack(params);
}

function extractYearFromIsoString(dateStr: string | null): number | undefined {
	if (!dateStr) return undefined;
	const year = new Date(dateStr).getFullYear();
	return isNaN(year) ? undefined : year;
}

export function mapSoundCloudLikedTrack(like: SoundCloudLike): Track | null {
	const track = mapSoundCloudTrack(like.track);
	if (!track) return null;

	return {
		...track,
		addedAt: new Date(like.created_at),
	};
}

export function mapSoundCloudUser(user: SoundCloudUser): Artist | null {
	if (!user.urn || !user.username) return null;

	const artwork = mapSoundCloudArtwork(user.avatar_url);

	return {
		id: `soundcloud:${extractIdFromUrn(user.urn)}`,
		name: user.username,
		artwork: artwork.length > 0 ? artwork : undefined,
		genres: undefined,
		monthlyListeners: user.followers_count,
		bio: user.description ?? undefined,
		externalUrls: {
			soundcloud: user.permalink_url,
		},
	};
}

export function mapSoundCloudPlaylistTrack(
	track: SoundCloudTrack,
	position: number
): PlaylistTrack | null {
	const mapped = mapSoundCloudTrack(track);
	if (!mapped) return null;

	return {
		track: mapped,
		addedAt: new Date(),
		position,
	};
}

export function mapSoundCloudSimplifiedPlaylist(playlist: SoundCloudPlaylist): Playlist | null {
	if (!playlist.urn || !playlist.title) return null;

	const artwork = mapSoundCloudArtwork(playlist.artwork_url, playlist.user?.avatar_url);

	return {
		id: extractIdFromUrn(playlist.urn),
		name: playlist.title,
		description: playlist.description ?? undefined,
		artwork: artwork.length > 0 ? artwork : undefined,
		tracks: [],
		createdAt: new Date(playlist.created_at),
		updatedAt: new Date(playlist.created_at),
		isSmartPlaylist: false,
		isPinned: false,
		source: 'soundcloud',
	};
}

export function mapSoundCloudPlaylist(playlist: SoundCloudPlaylist): Playlist | null {
	if (!playlist.urn || !playlist.title) return null;

	const artwork = mapSoundCloudArtwork(playlist.artwork_url, playlist.user?.avatar_url);
	const tracks: PlaylistTrack[] = mapAndFilterWithIndex(
		playlist.tracks as SoundCloudTrack[],
		mapSoundCloudPlaylistTrack
	);

	return {
		id: extractIdFromUrn(playlist.urn),
		name: playlist.title,
		description: playlist.description ?? undefined,
		artwork: artwork.length > 0 ? artwork : undefined,
		tracks,
		createdAt: new Date(playlist.created_at),
		updatedAt: new Date(playlist.created_at),
		isSmartPlaylist: false,
		isPinned: false,
		source: 'soundcloud',
	};
}

export function mapSoundCloudTracks(tracks: readonly SoundCloudTrack[]): Track[] {
	return mapAndFilter([...tracks], mapSoundCloudTrack);
}

export function mapSoundCloudLikedTracks(likes: readonly SoundCloudLike[]): Track[] {
	return mapAndFilter([...likes], mapSoundCloudLikedTrack);
}

export function mapSoundCloudUsers(users: readonly SoundCloudUser[]): Artist[] {
	return mapAndFilter([...users], mapSoundCloudUser);
}

export function mapSoundCloudSimplifiedPlaylists(
	playlists: readonly SoundCloudPlaylist[]
): Playlist[] {
	return mapAndFilter([...playlists], mapSoundCloudSimplifiedPlaylist);
}
