import type { AsyncResult } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import { libraryService } from '@/src/application/services/library-service';
import { useLibraryImportStore } from '@/src/application/state/library-import-store';
import type { LibraryOperations } from './library';
import type { InfoOperations } from './info';
import type { SpotifyClient } from './client';

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

export function createImportOperations(
	library: LibraryOperations,
	info: InfoOperations,
	client: SpotifyClient
): ImportOperations {
	let cancelled = false;

	return {
		async importLibrary(options?: ImportOptions): AsyncResult<ImportResult, Error> {
			const includeTracks = options?.includeTracks ?? true;
			const includeAlbums = options?.includeAlbums ?? true;
			const includePlaylists = options?.includePlaylists ?? true;
			const store = useLibraryImportStore.getState();

			if (!client.isAuthenticated()) {
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
					let offset = 0;
					const limit = 50;
					let hasMore = true;

					while (hasMore && !cancelled) {
						const result = await library.getSavedTracks({ limit, offset });
						if (!result.success) {
							store.addError(`Tracks page ${offset}`, result.error.message);
							logger.error('Failed to fetch saved tracks', result.error);
							break;
						}

						const { items, total } = result.data;
						const totalCount = total ?? 0;
						store.updateProgress(
							'tracks',
							Math.min(offset + items.length, totalCount),
							totalCount
						);
						const addResult = libraryService.addTracks(items);
						if (!addResult.success) {
							store.addError(`Tracks page ${offset}`, addResult.error.message);
							logger.warn('Failed to add tracks to library', addResult.error);
						}
						tracksImported += items.length;
						hasMore = result.data.hasMore;
						offset += limit;
					}
				}

				if (includeAlbums && !cancelled) {
					store.updateProgress('albums', 0, 0);
					let offset = 0;
					const limit = 20;
					let hasMore = true;

					while (hasMore && !cancelled) {
						const albumsResult = await library.getSavedAlbums({ limit, offset });
						if (!albumsResult.success) {
							store.addError(`Albums page ${offset}`, albumsResult.error.message);
							logger.error('Failed to fetch saved albums', albumsResult.error);
							break;
						}

						const { items: albums, total } = albumsResult.data;
						const totalCount = total ?? 0;

						for (let i = 0; i < albums.length; i++) {
							if (cancelled) break;
							const album = albums[i];
							store.updateProgress(
								'albums',
								Math.min(offset + i + 1, totalCount),
								totalCount,
								album.name
							);

							const tracksResult = await info.getAlbumTracks(album.id.value, {
								limit: 50,
							});
							if (tracksResult.success) {
								const addResult = libraryService.addTracks(tracksResult.data.items);
								if (addResult.success) {
									albumsImported++;
								} else {
									store.addError(album.name, addResult.error.message);
									logger.warn(
										'Failed to add album tracks to library',
										addResult.error
									);
								}
							} else {
								store.addError(album.name, tracksResult.error.message);
							}
						}

						hasMore = albumsResult.data.hasMore;
						offset += limit;
					}
				}

				if (includePlaylists && !cancelled) {
					store.updateProgress('playlists', 0, 0);
					let offset = 0;
					const limit = 50;
					let hasMore = true;

					while (hasMore && !cancelled) {
						const playlistsResult = await library.getUserPlaylists({ limit, offset });
						if (!playlistsResult.success) {
							store.addError(
								`Playlists page ${offset}`,
								playlistsResult.error.message
							);
							logger.error('Failed to fetch user playlists', playlistsResult.error);
							break;
						}

						const { items: playlists, total } = playlistsResult.data;
						const totalCount = total ?? 0;

						for (let i = 0; i < playlists.length; i++) {
							if (cancelled) break;
							const playlist = playlists[i];
							store.updateProgress(
								'playlists',
								Math.min(offset + i + 1, totalCount),
								totalCount,
								playlist.name
							);

							const fullPlaylistResult = await library.getPlaylist(playlist.id);
							if (fullPlaylistResult.success) {
								const addResult = libraryService.addPlaylist(
									fullPlaylistResult.data
								);
								if (addResult.success) {
									playlistsImported++;
								} else {
									store.addError(playlist.name, addResult.error.message);
									logger.warn(
										'Failed to add playlist to library',
										addResult.error
									);
								}
							} else {
								store.addError(playlist.name, fullPlaylistResult.error.message);
							}
						}

						hasMore = playlistsResult.data.hasMore;
						offset += limit;
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
