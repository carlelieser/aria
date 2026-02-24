import type { AsyncResult } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import { libraryService } from '@/src/application/services/library-service';
import { useLibraryImportStore } from '@/src/application/state/library-import-store';
import type { YouTubeMusicLibraryOperations } from './library';

const logger = getLogger('YouTubeMusic:Import');

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

export function createImportOperations(library: YouTubeMusicLibraryOperations): ImportOperations {
	let cancelled = false;

	return {
		async importLibrary(options?: ImportOptions): AsyncResult<ImportResult, Error> {
			const includeTracks = options?.includeTracks ?? true;
			const includePlaylists = options?.includePlaylists ?? true;
			const store = useLibraryImportStore.getState();

			cancelled = false;
			store.startImport('youtube-music');

			let tracksImported = 0;
			let playlistsImported = 0;

			try {
				if (includeTracks && !cancelled) {
					store.updateProgress('tracks', 0, 0);

					const tracksResult = await library.getLikedTracks();
					if (tracksResult.success) {
						const tracks = tracksResult.data;
						store.updateProgress('tracks', tracks.length, tracks.length);
						const addResult = libraryService.addTracks(tracks);
						if (!addResult.success) {
							store.addError('Liked tracks', addResult.error.message);
							logger.warn('Failed to add tracks to library', addResult.error);
						}
						tracksImported = tracks.length;
					} else {
						store.addError('Liked tracks', tracksResult.error.message);
						logger.error('Failed to fetch liked tracks', tracksResult.error);
					}
				}

				if (includePlaylists && !cancelled) {
					store.updateProgress('playlists', 0, 0);

					const playlistsResult = await library.getUserPlaylists();
					if (!playlistsResult.success) {
						store.addError('Playlists', playlistsResult.error.message);
						logger.error('Failed to fetch playlists', playlistsResult.error);
					} else {
						const playlists = playlistsResult.data;

						for (let i = 0; i < playlists.length; i++) {
							if (cancelled) break;
							const playlist = playlists[i];
							store.updateProgress(
								'playlists',
								i + 1,
								playlists.length,
								playlist.name
							);

							const tracksResult = await library.getPlaylistTracks(playlist.id);
							if (tracksResult.success) {
								const playlistWithTracks = {
									...playlist,
									tracks: tracksResult.data.map((track, index) => ({
										track,
										addedAt: new Date(),
										position: index,
									})),
									updatedAt: new Date(),
								};
								const addResult = libraryService.addPlaylist(playlistWithTracks);
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
								store.addError(playlist.name, tracksResult.error.message);
							}
						}
					}
				}

				store.completeImport();
				logger.info(
					`Import complete: ${tracksImported} tracks, ${playlistsImported} playlists`
				);

				return ok({
					tracksImported,
					playlistsImported,
					errors: store.errors.length,
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
