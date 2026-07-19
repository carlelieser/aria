import type { AsyncResult } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import { libraryService } from '@/src/application/services/library-service';
import { useLibraryImportStore } from '@/src/application/state/library-import-store';
import type { SpotifyAuthManager } from './auth';
import type { SpotifyProxyClient } from './proxy-client';
import { toAlbumReference } from '@domain/entities/album';
import { mapProxySavedTracks, mapProxyLibrary, mapProxyAlbumTracks } from './proxy-mappers';

const logger = getLogger('Spotify:Import');

interface ImportResult {
	readonly tracksImported: number;
	readonly albumsImported: number;
	readonly playlistsImported: number;
	readonly errors: number;
}

interface ImportOptions {
	readonly includeTracks?: boolean;
	readonly includeAlbums?: boolean;
	readonly includePlaylists?: boolean;
}

export interface ImportOperations {
	importLibrary(options?: ImportOptions): AsyncResult<ImportResult, Error>;
	cancelImport(): void;
}

/**
 * Library import via the spot-api proxy.
 *
 * The proxy returns each collection in a single response (no client-side
 * pagination), which proxy-mappers normalizes into domain entities. Saved
 * tracks and library items (albums/playlists/artists) come from two calls.
 */
export function createImportOperations(
	auth: SpotifyAuthManager,
	proxy: SpotifyProxyClient
): ImportOperations {
	let cancelled = false;

	return {
		async importLibrary(options?: ImportOptions): AsyncResult<ImportResult, Error> {
			const includeTracks = options?.includeTracks ?? true;
			const includeAlbums = options?.includeAlbums ?? true;
			const includePlaylists = options?.includePlaylists ?? true;
			const store = useLibraryImportStore.getState();

			const session = auth.getSession();
			if (!session) {
				store.startImport('spotify');
				store.updateProgress('error', 0, 0);
				store.completeImport();
				return err(new Error('Not authenticated with Spotify. Please log in first.'));
			}

			cancelled = false;
			store.startImport('spotify');

			let tracksImported = 0;
			let albumsImported = 0;
			let playlistsImported = 0;

			try {
				if (includeTracks && !cancelled) {
					store.updateProgress('tracks', 0, 0);
					const result = await proxy.getSavedTracks(session);
					if (!result.success) {
						store.addError('Saved tracks', result.error.message);
						logger.error('Failed to fetch saved tracks', result.error);
					} else {
						const tracks = mapProxySavedTracks(result.data);
						store.updateProgress('tracks', tracks.length, tracks.length);
						const addResult = libraryService.addTracks(tracks);
						if (addResult.success) {
							tracksImported = tracks.length;
						} else {
							store.addError('Saved tracks', addResult.error.message);
							logger.warn('Failed to add tracks to library', addResult.error);
						}
					}
				}

				if ((includeAlbums || includePlaylists) && !cancelled) {
					const result = await proxy.getLibrary(session);
					if (!result.success) {
						store.addError('Library', result.error.message);
						logger.error('Failed to fetch library', result.error);
					} else {
						const { albums, playlists } = mapProxyLibrary(result.data);

						// Aria derives albums from imported tracks, so importing
						// a saved album means importing its tracks.
						if (includeAlbums && !cancelled) {
							store.updateProgress('albums', 0, albums.length);
							for (let i = 0; i < albums.length; i++) {
								if (cancelled) break;
								const album = albums[i];
								store.updateProgress('albums', i + 1, albums.length, album.name);

								const tracksResult = await proxy.getAlbumTracks(
									session,
									album.id.sourceId
								);
								if (!tracksResult.success) {
									store.addError(album.name, tracksResult.error.message);
									continue;
								}

								const tracks = mapProxyAlbumTracks(
									tracksResult.data,
									toAlbumReference(album),
									album.artwork ?? []
								);
								const addResult = libraryService.addTracks(tracks);
								if (addResult.success) {
									albumsImported++;
								} else {
									store.addError(album.name, addResult.error.message);
								}
							}
						}

						if (includePlaylists && !cancelled) {
							store.updateProgress('playlists', playlists.length, playlists.length);
							for (const playlist of playlists) {
								if (cancelled) break;
								const addResult = libraryService.addPlaylist(playlist);
								if (addResult.success) {
									playlistsImported++;
								} else {
									store.addError(playlist.name, addResult.error.message);
								}
							}
						}
					}
				}

				store.completeImport();

				const errorCount = useLibraryImportStore.getState().errors.length;
				const totalImported = tracksImported + albumsImported + playlistsImported;

				if (totalImported === 0 && errorCount > 0) {
					logger.error(`Import failed: all ${errorCount} operations errored`);
					return err(new Error('Import failed — could not fetch any data from Spotify'));
				}

				logger.info(
					`Import complete: ${tracksImported} tracks, ${albumsImported} albums, ${playlistsImported} playlists`
				);

				return ok({
					tracksImported,
					albumsImported,
					playlistsImported,
					errors: errorCount,
				});
			} catch (error) {
				const importError = error instanceof Error ? error : new Error(String(error));
				store.updateProgress('error', 0, 0);
				store.completeImport();
				logger.error('Library import failed', importError);
				return err(importError);
			}
		},

		cancelImport(): void {
			cancelled = true;
			logger.info('Import cancellation requested');
		},
	};
}
