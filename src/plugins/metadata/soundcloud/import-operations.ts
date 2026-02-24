import type { AsyncResult } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import { libraryService } from '@/src/application/services/library-service';
import { useLibraryImportStore } from '@/src/application/state/library-import-store';
import type { LibraryOperations } from './library';
import type { SoundCloudClient } from './client';

const logger = getLogger('SoundCloud:Import');

interface ImportResult {
	readonly tracksImported: number;
	readonly playlistsImported: number;
	readonly errors: number;
}

interface ImportOptions {
	readonly includeTracks?: boolean;
	readonly includePlaylists?: boolean;
}

export interface ImportOperations {
	importLibrary(options?: ImportOptions): AsyncResult<ImportResult, Error>;
	cancelImport(): void;
}

export function createImportOperations(
	library: LibraryOperations,
	client: SoundCloudClient
): ImportOperations {
	let cancelled = false;

	return {
		async importLibrary(options?: ImportOptions): AsyncResult<ImportResult, Error> {
			const includeTracks = options?.includeTracks ?? true;
			const includePlaylists = options?.includePlaylists ?? true;
			const store = useLibraryImportStore.getState();

			if (!client.isAuthenticated()) {
				store.startImport('soundcloud');
				store.updateProgress('error', 0, 0);
				store.completeImport();
				return err(new Error('Not authenticated with SoundCloud. Please log in first.'));
			}

			cancelled = false;
			store.startImport('soundcloud');

			let tracksImported = 0;
			let playlistsImported = 0;

			try {
				if (includeTracks && !cancelled) {
					store.updateProgress('tracks', 0, 0);
					let offset = 0;
					const limit = 50;
					let hasMore = true;

					while (hasMore && !cancelled) {
						const result = await library.getLikedTracks({ limit, offset });
						if (!result.success) {
							store.addError(`Likes page ${offset}`, result.error.message);
							logger.error('Failed to fetch liked tracks', result.error);
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
							store.addError(`Likes page ${offset}`, addResult.error.message);
							logger.warn('Failed to add tracks to library', addResult.error);
						}
						tracksImported += items.length;
						hasMore = result.data.hasMore;
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
							logger.error('Failed to fetch playlists', playlistsResult.error);
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

							const fullResult = await library.getPlaylist(playlist.id);
							if (fullResult.success) {
								const addResult = libraryService.addPlaylist(fullResult.data);
								if (addResult.success) {
									playlistsImported++;
								} else {
									store.addError(playlist.name, addResult.error.message);
									logger.warn('Failed to add playlist', addResult.error);
								}
							} else {
								store.addError(playlist.name, fullResult.error.message);
							}
						}

						hasMore = playlistsResult.data.hasMore;
						offset += limit;
					}
				}

				store.completeImport();

				const errorCount = useLibraryImportStore.getState().errors.length;
				const totalImported = tracksImported + playlistsImported;

				if (totalImported === 0 && errorCount > 0) {
					logger.error(`Import failed: all ${errorCount} operations errored`);
					return err(
						new Error('Import failed — could not fetch any data from SoundCloud')
					);
				}

				logger.info(
					`Import complete: ${tracksImported} tracks, ${playlistsImported} playlists`
				);

				return ok({ tracksImported, playlistsImported, errors: errorCount });
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
