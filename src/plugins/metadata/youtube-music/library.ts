import type { Track } from '@domain/entities/track';
import type { Playlist } from '@domain/entities/playlist';
import type { AsyncResult } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import type { ClientManager } from './client';
import { mapYouTubeTrack, mapThumbnailsToArtwork } from './mappers';
import type { YouTubeMusicItem } from './types';

const logger = getLogger('YouTubeMusic:Library');

export interface YouTubeMusicLibraryOperations {
	getLikedTracks(): AsyncResult<Track[], Error>;
	getUserPlaylists(): AsyncResult<Playlist[], Error>;
	getPlaylistTracks(playlistId: string): AsyncResult<Track[], Error>;
}

interface Continuable {
	has_continuation: boolean;
	getContinuation(): Promise<Continuable & { contents?: unknown[] }>;
	contents?: unknown[];
}

function extractTracksFromContents(contents: unknown[]): Track[] {
	const tracks: Track[] = [];

	for (const item of contents) {
		if (!item) continue;
		const musicItem = item as YouTubeMusicItem;
		const track = mapYouTubeTrack(musicItem);
		if (track) {
			tracks.push(track);
		}
	}

	return tracks;
}

function extractTracksFromShelves(contents: unknown[] | undefined): Track[] {
	if (!contents) return [];
	const tracks: Track[] = [];

	for (const shelf of contents) {
		const shelfObj = shelf as { contents?: unknown[] };
		if (shelfObj.contents) {
			tracks.push(...extractTracksFromContents(shelfObj.contents));
		}
	}

	return tracks;
}

export function createLibraryOperations(
	clientManager: ClientManager
): YouTubeMusicLibraryOperations {
	return {
		async getLikedTracks(): AsyncResult<Track[], Error> {
			try {
				const client = await clientManager.getClient();
				const library = await client.music.getLibrary();
				const allTracks: Track[] = [];

				const libraryObj = library as unknown as Continuable;
				allTracks.push(
					...extractTracksFromShelves(libraryObj.contents as unknown[] | undefined)
				);

				let continuation: Continuable = libraryObj;
				while (continuation.has_continuation) {
					const next = await continuation.getContinuation();
					allTracks.push(
						...extractTracksFromShelves(next.contents as unknown[] | undefined)
					);
					continuation = next;
				}

				logger.info(`Fetched ${allTracks.length} liked tracks from YouTube Music`);
				return ok(allTracks);
			} catch (error) {
				const libraryError = error instanceof Error ? error : new Error(String(error));
				logger.error('Failed to fetch liked tracks', libraryError);
				return err(libraryError);
			}
		},

		async getUserPlaylists(): AsyncResult<Playlist[], Error> {
			try {
				const client = await clientManager.getClient();
				const library = await client.music.getLibrary();
				const playlists: Playlist[] = [];

				const contents = (library as unknown as { contents?: unknown[] }).contents;
				if (!contents) {
					return ok(playlists);
				}

				for (const shelf of contents) {
					const shelfObj = shelf as { contents?: unknown[] };
					if (!shelfObj.contents) continue;

					for (const item of shelfObj.contents) {
						const playlistItem = item as YouTubeMusicItem & {
							playlist_id?: string;
						};
						const playlistId = playlistItem.playlist_id || playlistItem.id;
						if (!playlistId) continue;

						const title =
							typeof playlistItem.title === 'string'
								? playlistItem.title
								: (playlistItem.title as { text?: string } | undefined)?.text;
						if (!title) continue;

						const artwork = mapThumbnailsToArtwork(
							playlistItem.thumbnails ?? playlistItem.thumbnail
						);

						playlists.push({
							id: playlistId,
							name: title,
							artwork: artwork.length > 0 ? artwork : undefined,
							tracks: [],
							createdAt: new Date(),
							updatedAt: new Date(),
							isSmartPlaylist: false,
							isPinned: false,
							source: 'youtube-music',
						});
					}
				}

				logger.info(`Fetched ${playlists.length} playlists from YouTube Music`);
				return ok(playlists);
			} catch (error) {
				const playlistError = error instanceof Error ? error : new Error(String(error));
				logger.error('Failed to fetch user playlists', playlistError);
				return err(playlistError);
			}
		},

		async getPlaylistTracks(playlistId: string): AsyncResult<Track[], Error> {
			try {
				const client = await clientManager.getClient();
				const playlist = await client.music.getPlaylist(playlistId);
				const allTracks: Track[] = [];

				const playlistObj = playlist as unknown as Continuable;
				const contents = playlistObj.contents as unknown[] | undefined;
				if (contents) {
					allTracks.push(...extractTracksFromContents(contents));
				}

				let continuation: Continuable = playlistObj;
				while (continuation.has_continuation) {
					const next = await continuation.getContinuation();
					if (next.contents) {
						allTracks.push(...extractTracksFromContents(next.contents as unknown[]));
					}
					continuation = next;
				}

				logger.info(`Fetched ${allTracks.length} tracks from playlist ${playlistId}`);
				return ok(allTracks);
			} catch (error) {
				const trackError = error instanceof Error ? error : new Error(String(error));
				logger.error(`Failed to fetch playlist tracks for ${playlistId}`, trackError);
				return err(trackError);
			}
		},
	};
}
