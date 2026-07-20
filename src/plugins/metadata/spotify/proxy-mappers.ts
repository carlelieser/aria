/**
 * The single place coupled to SpotAPI's GraphQL shapes (see spot-api's
 * reference/library-node-shapes.txt). Mappers fail soft: a shape mismatch
 * yields null/[], not a throw. Envelope quirks: the library root is `me.library`
 * or `me.libraryV3`; entities wrap under `item.data`, saved tracks `track.data`.
 */

import { createTrack, type Track } from '@domain/entities/track';
import type { Album, AlbumReference } from '@domain/entities/album';
import type { Artist, ArtistReference } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import { createArtwork, type Artwork } from '@domain/value-objects/artwork';
import { TrackId } from '@domain/value-objects/track-id';
import { AlbumId } from '@domain/value-objects/album-id';
import { Duration } from '@domain/value-objects/duration';
import { createStreamingSource } from '@domain/value-objects/audio-source';

// --- raw shape fragments (only the fields we consume) ---

interface RawImageSource {
	readonly url?: string;
	readonly width?: number;
	readonly height?: number;
}

interface RawArtistItem {
	readonly profile?: { readonly name?: string };
	readonly uri?: string;
}

interface RawLibraryItem {
	readonly addedAt?: { readonly isoString?: string };
	readonly item?: {
		readonly __typename?: string;
		readonly _uri?: string;
		readonly data?: Record<string, unknown>;
	};
}

function idFromUri(uri: string | undefined): string {
	if (!uri) return '';
	const parts = uri.split(':');
	return parts[parts.length - 1] ?? '';
}

function mapImageSources(sources: readonly RawImageSource[] | undefined): Artwork[] {
	if (!sources) return [];
	return sources
		.filter((s): s is RawImageSource & { url: string } => typeof s.url === 'string')
		.map((s) => createArtwork(s.url, s.width, s.height));
}

function mapArtistRefs(items: readonly RawArtistItem[] | undefined): ArtistReference[] {
	if (!items) return [];
	return (
		items
			.filter((a) => a.profile?.name)
			// `provider:rawId` so artist pages route to the Spotify provider.
			.map((a) => ({ id: `spotify:${idFromUri(a.uri)}`, name: a.profile?.name ?? '' }))
	);
}

// --- library node mappers (item.data) ---

export function mapProxyArtist(data: Record<string, unknown>): Artist | null {
	const profile = data.profile as { name?: string } | undefined;
	const uri = data.uri as string | undefined;
	const name = profile?.name;
	if (!name) return null;

	const visuals = data.visuals as { avatarImage?: { sources?: RawImageSource[] } } | undefined;
	const artwork = mapImageSources(visuals?.avatarImage?.sources);

	return {
		id: `spotify:${idFromUri(uri)}`,
		name,
		artwork: artwork.length > 0 ? artwork : undefined,
	};
}

export function mapProxyAlbum(data: Record<string, unknown>): Album | null {
	const uri = data.uri as string | undefined;
	const name = data.name as string | undefined;
	if (!name || !uri) return null;

	const artists = data.artists as { items?: RawArtistItem[] } | undefined;
	const coverArt = data.coverArt as { sources?: RawImageSource[] } | undefined;
	const date = data.date as { isoString?: string } | undefined;
	const artwork = mapImageSources(coverArt?.sources);

	return {
		id: AlbumId.create('spotify', idFromUri(uri)),
		name,
		artists: mapArtistRefs(artists?.items),
		artwork: artwork.length > 0 ? artwork : undefined,
		releaseDate: date?.isoString,
	};
}

export function mapProxyPlaylist(data: Record<string, unknown>): Playlist | null {
	const uri = data.uri as string | undefined;
	const name = data.name as string | undefined;
	if (!name || !uri) return null;

	const images = data.images as { items?: { sources?: RawImageSource[] }[] } | undefined;
	const description = data.description as string | undefined;
	const artwork = mapImageSources(images?.items?.[0]?.sources);
	const now = new Date();

	return {
		id: `spotify:${idFromUri(uri)}`,
		name,
		description: description || undefined,
		artwork: artwork.length > 0 ? artwork : undefined,
		tracks: [],
		createdAt: now,
		updatedAt: now,
		isSmartPlaylist: false,
		source: 'spotify',
	};
}

// --- saved track mapper (track.data) ---

interface RawSavedTrackItem {
	readonly addedAt?: { readonly isoString?: string };
	readonly track?: {
		readonly _uri?: string;
		readonly data?: Record<string, unknown>;
	};
}

export function mapProxySavedTrack(item: RawSavedTrackItem): Track | null {
	const data = item.track?.data;
	if (!data) return null;

	// Identity is on `track._uri`; `data` here carries no `uri` of its own.
	const uri = item.track?._uri;
	const name = data.name as string | undefined;
	if (!name || !uri) return null;

	const artists = data.artists as { items?: RawArtistItem[] } | undefined;
	const duration = data.duration as { totalMilliseconds?: number } | undefined;
	const albumOfTrack = data.albumOfTrack as
		| {
				uri?: string;
				name?: string;
				coverArt?: { sources?: RawImageSource[] };
		  }
		| undefined;

	const albumRef: AlbumReference | undefined =
		albumOfTrack?.name && albumOfTrack.uri
			? { id: `spotify:${idFromUri(albumOfTrack.uri)}`, name: albumOfTrack.name }
			: undefined;

	const artwork = mapImageSources(albumOfTrack?.coverArt?.sources);
	const sourceId = idFromUri(uri);

	const track = createTrack({
		id: TrackId.create('spotify', sourceId),
		title: name,
		artists: mapArtistRefs(artists?.items),
		album: albumRef,
		duration: Duration.fromMilliseconds(duration?.totalMilliseconds ?? 0),
		artwork: artwork.length > 0 ? artwork : undefined,
		source: createStreamingSource('spotify', sourceId),
	});

	// createTrack defaults addedAt to undefined; restore the saved-at date.
	const addedAt = item.addedAt?.isoString;
	return addedAt ? { ...track, addedAt: new Date(addedAt) } : track;
}

// --- album track mapper (item.track, direct fields) ---

interface RawAlbumTrackItem {
	readonly track?: Record<string, unknown>;
}

// Fields sit directly on `item.track` (no `.data`); album context is the caller's.
export function mapProxyAlbumTrack(
	item: RawAlbumTrackItem,
	albumRef: AlbumReference | undefined,
	albumArtwork: Artwork[]
): Track | null {
	const track = item.track;
	if (!track) return null;

	const uri = track.uri as string | undefined;
	const name = track.name as string | undefined;
	if (!name || !uri) return null;

	const artists = track.artists as { items?: RawArtistItem[] } | undefined;
	const duration = track.duration as { totalMilliseconds?: number } | undefined;
	const trackNumber = track.trackNumber as number | undefined;
	const discNumber = track.discNumber as number | undefined;
	const sourceId = idFromUri(uri);

	return createTrack({
		id: TrackId.create('spotify', sourceId),
		title: name,
		artists: mapArtistRefs(artists?.items),
		album: albumRef,
		duration: Duration.fromMilliseconds(duration?.totalMilliseconds ?? 0),
		artwork: albumArtwork.length > 0 ? albumArtwork : undefined,
		source: createStreamingSource('spotify', sourceId),
		metadata: { trackNumber, discNumber },
	});
}

export function mapProxyAlbumTracks(
	items: unknown[],
	albumRef: AlbumReference | undefined,
	albumArtwork: Artwork[]
): Track[] {
	return items
		.map((it) => mapProxyAlbumTrack(it as RawAlbumTrackItem, albumRef, albumArtwork))
		.filter((t): t is Track => t !== null);
}

// --- artist overview + discography mappers ---

export function mapProxyArtistOverview(data: Record<string, unknown>): Artist | null {
	const profile = data.profile as { name?: string } | undefined;
	const uri = data.uri as string | undefined;
	const name = profile?.name;
	if (!name) return null;

	const visuals = data.visuals as { avatarImage?: { sources?: RawImageSource[] } } | undefined;
	const stats = data.stats as { monthlyListeners?: number } | undefined;
	const artwork = mapImageSources(visuals?.avatarImage?.sources);

	return {
		id: `spotify:${idFromUri(uri)}`,
		name,
		artwork: artwork.length > 0 ? artwork : undefined,
		monthlyListeners: stats?.monthlyListeners,
	};
}

export function mapProxyArtistAlbums(items: unknown[]): Album[] {
	return items
		.map((it) => mapProxyAlbum(it as Record<string, unknown>))
		.filter((a): a is Album => a !== null);
}

// --- playlist track mapper (item.itemV2.data, trackDuration) ---

interface RawPlaylistTrackItem {
	readonly itemV2?: {
		readonly __typename?: string;
		readonly data?: Record<string, unknown>;
	};
}

// Wraps under `itemV2.data`, and uses `trackDuration` (not `duration`).
export function mapProxyPlaylistTrack(item: RawPlaylistTrackItem): Track | null {
	const data = item.itemV2?.data;
	if (!data) return null;

	const uri = data.uri as string | undefined;
	const name = data.name as string | undefined;
	if (!name || !uri) return null;

	const artists = data.artists as { items?: RawArtistItem[] } | undefined;
	const duration = data.trackDuration as { totalMilliseconds?: number } | undefined;
	const albumOfTrack = data.albumOfTrack as
		| { uri?: string; name?: string; coverArt?: { sources?: RawImageSource[] } }
		| undefined;

	const albumRef: AlbumReference | undefined =
		albumOfTrack?.name && albumOfTrack.uri
			? { id: `spotify:${idFromUri(albumOfTrack.uri)}`, name: albumOfTrack.name }
			: undefined;

	const artwork = mapImageSources(albumOfTrack?.coverArt?.sources);
	const sourceId = idFromUri(uri);

	return createTrack({
		id: TrackId.create('spotify', sourceId),
		title: name,
		artists: mapArtistRefs(artists?.items),
		album: albumRef,
		duration: Duration.fromMilliseconds(duration?.totalMilliseconds ?? 0),
		artwork: artwork.length > 0 ? artwork : undefined,
		source: createStreamingSource('spotify', sourceId),
	});
}

export function mapProxyPlaylistTracks(items: unknown[]): Track[] {
	return items
		.map((it) => mapProxyPlaylistTrack(it as RawPlaylistTrackItem))
		.filter((t): t is Track => t !== null);
}

// --- top-level extractors (handle library / libraryV3 envelope) ---

function libraryRoot(payload: unknown): Record<string, unknown> | null {
	const me = (payload as { data?: { me?: Record<string, unknown> } })?.data?.me;
	if (!me) return null;
	const node = (me.library ?? me.libraryV3) as Record<string, unknown> | undefined;
	return node ?? null;
}

export interface MappedLibrary {
	readonly artists: Artist[];
	readonly albums: Album[];
	readonly playlists: Playlist[];
}

export function mapProxyLibrary(payload: unknown): MappedLibrary {
	const root = libraryRoot(payload);
	const items = (root?.items as RawLibraryItem[] | undefined) ?? [];

	const artists: Artist[] = [];
	const albums: Album[] = [];
	const playlists: Playlist[] = [];

	for (const it of items) {
		const data = it.item?.data;
		if (!data) continue;
		switch (it.item?.__typename) {
			case 'ArtistResponseWrapper': {
				const a = mapProxyArtist(data);
				if (a) artists.push(a);
				break;
			}
			case 'AlbumResponseWrapper': {
				const a = mapProxyAlbum(data);
				if (a) albums.push(a);
				break;
			}
			case 'PlaylistResponseWrapper': {
				const p = mapProxyPlaylist(data);
				if (p) playlists.push(p);
				break;
			}
			// "Liked Songs" is a pointer; its tracks come from the saved-tracks endpoint.
			default:
				break;
		}
	}

	return { artists, albums, playlists };
}

export function mapProxySavedTracks(items: unknown[]): Track[] {
	return items
		.map((it) => mapProxySavedTrack(it as RawSavedTrackItem))
		.filter((t): t is Track => t !== null);
}
