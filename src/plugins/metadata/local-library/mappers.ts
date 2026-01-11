import * as FileSystem from 'expo-file-system/legacy';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import { createTrack } from '@domain/entities/track';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createLocalSource, type AudioFileType } from '@domain/value-objects/audio-source';
import { createArtwork, type Artwork } from '@domain/value-objects/artwork';
import type { ScannedFile, ParsedMetadata, LocalTrack, LocalAlbum, LocalArtist } from './types';

const ARTWORK_CACHE_DIR = 'local-library/artwork/';

export function generateLocalTrackId(filePath: string): string {
	// Create a simple hash from the file path for consistent IDs
	let hash = 0;
	for (let i = 0; i < filePath.length; i++) {
		const char = filePath.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return `local_${Math.abs(hash).toString(36)}`;
}

export function generateAlbumId(albumName: string, artistName: string): string {
	const combined = `${albumName.toLowerCase()}_${artistName.toLowerCase()}`;
	let hash = 0;
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return `album_${Math.abs(hash).toString(36)}`;
}

export function generateArtistId(artistName: string): string {
	const normalized = artistName.toLowerCase().trim();
	let hash = 0;
	for (let i = 0; i < normalized.length; i++) {
		const char = normalized.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return `artist_${Math.abs(hash).toString(36)}`;
}

export function mapToLocalTrack(
	file: ScannedFile,
	metadata: ParsedMetadata,
	artworkPath?: string
): LocalTrack {
	const id = generateLocalTrackId(file.uri);
	const artistName = metadata.artist || _parseArtistFromFilename(file.name);
	const artistId = generateArtistId(artistName);

	let albumId: string | undefined;
	let albumName: string | undefined;

	if (metadata.album) {
		albumName = metadata.album;
		albumId = generateAlbumId(metadata.album, artistName);
	}

	return {
		id,
		filePath: file.uri,
		fileName: file.name,
		fileSize: file.size,
		title: metadata.title || _parseTitleFromFilename(file.name),
		artistName,
		artistId,
		albumName,
		albumId,
		duration: metadata.duration,
		year: metadata.year,
		genre: metadata.genre,
		trackNumber: metadata.trackNumber,
		discNumber: metadata.discNumber,
		artworkPath,
		addedAt: Date.now(),
		modifiedAt: file.modifiedTime,
	};
}

export function localTrackToTrack(localTrack: LocalTrack): Track {
	const artwork: Artwork[] | undefined = localTrack.artworkPath
		? [createArtwork(localTrack.artworkPath, 300, 300)]
		: undefined;

	const fileType = _getFileTypeFromPath(localTrack.filePath);

	return createTrack({
		id: TrackId.create('local-library', localTrack.id),
		title: localTrack.title,
		artists: [{ id: localTrack.artistId, name: localTrack.artistName }],
		album: localTrack.albumId
			? { id: localTrack.albumId, name: localTrack.albumName ?? '' }
			: undefined,
		duration: Duration.fromSeconds(localTrack.duration),
		artwork,
		source: createLocalSource(localTrack.filePath, fileType, localTrack.fileSize),
		metadata: {
			year: localTrack.year,
			genre: localTrack.genre,
			trackNumber: localTrack.trackNumber,
			discNumber: localTrack.discNumber,
		},
	});
}

export function localAlbumToAlbum(localAlbum: LocalAlbum): Album {
	const artwork: Artwork[] | undefined = localAlbum.artworkPath
		? [createArtwork(localAlbum.artworkPath, 300, 300)]
		: undefined;

	return {
		id: localAlbum.id,
		name: localAlbum.name,
		artists: [{ id: localAlbum.artistId, name: localAlbum.artistName }],
		artwork,
		releaseDate: localAlbum.year?.toString(),
		trackCount: localAlbum.trackCount,
		totalDurationMs: localAlbum.totalDuration * 1000,
		albumType: 'album',
	};
}

export function localArtistToArtist(localArtist: LocalArtist): Artist {
	return {
		id: localArtist.id,
		name: localArtist.name,
	};
}

export function buildAlbumsFromTracks(tracks: LocalTrack[]): Map<string, LocalAlbum> {
	const albums = new Map<string, LocalAlbum>();

	for (const track of tracks) {
		if (!track.albumId || !track.albumName) continue;

		const existing = albums.get(track.albumId);
		if (existing) {
			albums.set(track.albumId, {
				...existing,
				trackCount: existing.trackCount + 1,
				totalDuration: existing.totalDuration + track.duration,
			});
		} else {
			albums.set(track.albumId, {
				id: track.albumId,
				name: track.albumName,
				artistId: track.artistId,
				artistName: track.artistName,
				year: track.year,
				trackCount: 1,
				totalDuration: track.duration,
				artworkPath: track.artworkPath,
			});
		}
	}

	return albums;
}

export function buildArtistsFromTracks(tracks: LocalTrack[]): Map<string, LocalArtist> {
	const artists = new Map<string, LocalArtist>();
	const albumsByArtist = new Map<string, Set<string>>();

	for (const track of tracks) {
		const existing = artists.get(track.artistId);
		if (existing) {
			artists.set(track.artistId, {
				...existing,
				trackCount: existing.trackCount + 1,
			});
		} else {
			artists.set(track.artistId, {
				id: track.artistId,
				name: track.artistName,
				albumCount: 0,
				trackCount: 1,
			});
		}

		if (track.albumId) {
			if (!albumsByArtist.has(track.artistId)) {
				albumsByArtist.set(track.artistId, new Set());
			}
			albumsByArtist.get(track.artistId)!.add(track.albumId);
		}
	}

	// Update album counts
	for (const [artistId, albumSet] of albumsByArtist) {
		const artist = artists.get(artistId);
		if (artist) {
			artists.set(artistId, {
				...artist,
				albumCount: albumSet.size,
			});
		}
	}

	return artists;
}

export async function cacheArtwork(
	trackId: string,
	data: Uint8Array,
	mimeType: string
): Promise<string | null> {
	try {
		const extension = mimeType.includes('png') ? 'png' : 'jpg';
		const cacheDir = FileSystem.documentDirectory + ARTWORK_CACHE_DIR;

		await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});

		const filePath = `${cacheDir}${trackId}.${extension}`;

		// Convert Uint8Array to base64
		const base64 = _uint8ArrayToBase64(data);

		await FileSystem.writeAsStringAsync(filePath, base64, {
			encoding: FileSystem.EncodingType.Base64,
		});

		return filePath;
	} catch {
		return null;
	}
}

export async function clearArtworkCache(): Promise<void> {
	try {
		const cacheDir = FileSystem.documentDirectory + ARTWORK_CACHE_DIR;
		await FileSystem.deleteAsync(cacheDir, { idempotent: true });
	} catch {
		// Ignore errors
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Private Helpers
// ─────────────────────────────────────────────────────────────────────────────

function _parseTitleFromFilename(fileName: string): string {
	const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
	const separators = [' - ', ' – ', ' — ', '_-_'];

	for (const separator of separators) {
		if (nameWithoutExt.includes(separator)) {
			const parts = nameWithoutExt.split(separator);
			if (parts.length >= 2) {
				return parts.slice(1).join(separator).trim();
			}
		}
	}

	return nameWithoutExt.trim();
}

function _parseArtistFromFilename(fileName: string): string {
	const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
	const separators = [' - ', ' – ', ' — ', '_-_'];

	for (const separator of separators) {
		if (nameWithoutExt.includes(separator)) {
			const [artist] = nameWithoutExt.split(separator);
			return artist.trim();
		}
	}

	return 'Unknown Artist';
}

function _getFileTypeFromPath(filePath: string): AudioFileType {
	const ext = filePath.split('.').pop()?.toLowerCase();
	const validTypes: AudioFileType[] = ['mp3', 'flac', 'aac', 'm4a', 'wav', 'ogg', 'opus'];

	if (ext && validTypes.includes(ext as AudioFileType)) {
		return ext as AudioFileType;
	}

	return 'mp3';
}

function _uint8ArrayToBase64(data: Uint8Array): string {
	let binary = '';
	const len = data.length;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(data[i]);
	}
	return btoa(binary);
}
