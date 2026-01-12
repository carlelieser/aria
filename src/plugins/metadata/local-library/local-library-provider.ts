import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import { TrackId } from '@domain/value-objects/track-id';
import { createAudioStream, type AudioStream } from '@domain/value-objects/audio-stream';
import type {
	MetadataProvider,
	MetadataCapability,
	SearchOptions,
	SearchResults,
} from '@plugins/core/interfaces/metadata-provider';
import type {
	AudioSourceProvider,
	AudioSourceCapability,
	StreamOptions,
} from '@plugins/core/interfaces/audio-source-provider';
import type { PluginInitContext, PluginStatus } from '@plugins/core/interfaces/base-plugin';
import { ok, err, type AsyncResult } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import {
	PLUGIN_MANIFEST,
	METADATA_CAPABILITIES,
	AUDIO_CAPABILITIES,
	CONFIG_SCHEMA,
	DEFAULT_CONFIG,
	type LocalLibraryConfig,
} from './config';
import type { ScanProgress, LocalTrack, FolderInfo } from './types';
import { pickAudioFiles, scanFolder as scanFolderFiles } from './scanner/folder-scanner';
import { parseAudioMetadata } from './scanner/id3-parser';
import {
	useLocalLibraryStore,
	waitForLocalLibraryHydration,
	rebuildAlbumsAndArtists,
} from './storage/local-library-store';
import {
	initializeDatabase,
	closeDatabase,
	indexTracks,
	removeTracksForFolder as removeTracksFromDb,
} from './storage/database';
import {
	mapToLocalTrack,
	localTrackToTrack,
	localAlbumToAlbum,
	localArtistToArtist,
	cacheArtwork,
	generateLocalTrackId,
} from './mappers';

const logger = getLogger('LocalLibraryProvider');

/** Number of files to process concurrently */
const BATCH_CONCURRENCY = 5;

/** Minimum interval between progress updates (ms) */
const PROGRESS_THROTTLE_MS = 100;

/**
 * Process items in parallel batches with controlled concurrency.
 */
async function _processBatched<T, R>(
	items: T[],
	processor: (item: T, index: number) => Promise<R>,
	concurrency: number
): Promise<R[]> {
	const results: R[] = [];
	let index = 0;

	async function processNext(): Promise<void> {
		const currentIndex = index++;
		if (currentIndex >= items.length) return;

		const result = await processor(items[currentIndex], currentIndex);
		results[currentIndex] = result;
		await processNext();
	}

	// Start `concurrency` number of parallel processors
	const workers = Array(Math.min(concurrency, items.length))
		.fill(null)
		.map(() => processNext());

	await Promise.all(workers);
	return results;
}

/**
 * Creates a throttled version of a callback that only fires at most once per interval.
 */
function _createThrottledProgress(
	callback: ((progress: ScanProgress) => void) | undefined,
	intervalMs: number
): (progress: ScanProgress) => void {
	if (!callback) return () => {};

	let lastCall = 0;
	let pendingProgress: ScanProgress | null = null;

	return (progress: ScanProgress) => {
		const now = Date.now();
		pendingProgress = progress;

		// Always emit on phase changes or completion
		if (progress.phase === 'complete' || progress.phase === 'indexing') {
			callback(progress);
			lastCall = now;
			return;
		}

		if (now - lastCall >= intervalMs) {
			callback(pendingProgress);
			lastCall = now;
		}
	};
}

export class LocalLibraryProvider implements MetadataProvider, AudioSourceProvider {
	readonly manifest = PLUGIN_MANIFEST;
	readonly capabilities = new Set<MetadataCapability>(METADATA_CAPABILITIES);
	readonly audioCapabilities = new Set<AudioSourceCapability>(AUDIO_CAPABILITIES);
	readonly configSchema = CONFIG_SCHEMA;

	status: PluginStatus = 'uninitialized';

	private _config: LocalLibraryConfig;
	private _isScanning = false;
	private _scanProgress: ScanProgress | null = null;

	constructor(config: LocalLibraryConfig = DEFAULT_CONFIG) {
		this._config = { ...DEFAULT_CONFIG, ...config };
	}

	async onInit(_context: PluginInitContext): AsyncResult<void, Error> {
		try {
			this.status = 'initializing';

			// Wait for store hydration
			await waitForLocalLibraryHydration();

			// Initialize SQLite database
			const dbResult = await initializeDatabase();
			if (!dbResult.success) {
				throw dbResult.error;
			}

			this.status = 'ready';
			return ok(undefined);
		} catch (error) {
			this.status = 'error';
			return err(
				error instanceof Error ? error : new Error(`Failed to initialize: ${String(error)}`)
			);
		}
	}

	async onActivate(): AsyncResult<void, Error> {
		this.status = 'active';
		return ok(undefined);
	}

	async onDeactivate(): AsyncResult<void, Error> {
		this.status = 'ready';
		return ok(undefined);
	}

	async onDestroy(): AsyncResult<void, Error> {
		await closeDatabase();
		this.status = 'uninitialized';
		return ok(undefined);
	}

	hasCapability(capability: MetadataCapability): boolean {
		return this.capabilities.has(capability);
	}

	hasAudioCapability(capability: AudioSourceCapability): boolean {
		return this.audioCapabilities.has(capability);
	}

	supportsTrack(track: Track): boolean {
		// Check both TrackId sourceType and source type for local files
		const isLocalLibraryId =
			typeof track.id === 'object' && track.id.sourceType === 'local-library';
		const isLocalSource = track.source.type === 'local';
		return isLocalLibraryId || isLocalSource;
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// MetadataProvider Implementation
	// ─────────────────────────────────────────────────────────────────────────────

	async searchTracks(
		query: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Track>, Error> {
		try {
			const state = useLocalLibraryStore.getState();
			const tracks = state.searchTracks(query, options?.limit ?? 50);
			const domainTracks = tracks.map(localTrackToTrack);
			return ok(this._paginate(domainTracks, options));
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error(`Search failed: ${String(error)}`)
			);
		}
	}

	async searchAlbums(
		query: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Album>, Error> {
		try {
			const searchLower = query.toLowerCase();
			const state = useLocalLibraryStore.getState();
			const matchingAlbums: Album[] = [];

			for (const localAlbum of Object.values(state.albums)) {
				const matches =
					localAlbum.name.toLowerCase().includes(searchLower) ||
					localAlbum.artistName.toLowerCase().includes(searchLower);

				if (matches) {
					matchingAlbums.push(localAlbumToAlbum(localAlbum));
				}
			}

			return ok(this._paginate(matchingAlbums, options));
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error(`Search failed: ${String(error)}`)
			);
		}
	}

	async searchArtists(
		query: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Artist>, Error> {
		try {
			const searchLower = query.toLowerCase();
			const state = useLocalLibraryStore.getState();
			const matchingArtists: Artist[] = [];

			for (const localArtist of Object.values(state.artists)) {
				if (localArtist.name.toLowerCase().includes(searchLower)) {
					matchingArtists.push(localArtistToArtist(localArtist));
				}
			}

			return ok(this._paginate(matchingArtists, options));
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error(`Search failed: ${String(error)}`)
			);
		}
	}

	async getTrackInfo(trackId: TrackId): AsyncResult<Track, Error> {
		const state = useLocalLibraryStore.getState();
		const localTrack = state.tracks[trackId.sourceId];

		if (!localTrack) {
			return err(new Error(`Track not found: ${trackId.value}`));
		}

		return ok(localTrackToTrack(localTrack));
	}

	async getAlbumInfo(albumId: string): AsyncResult<Album, Error> {
		const state = useLocalLibraryStore.getState();
		const localAlbum = state.albums[albumId];

		if (!localAlbum) {
			return err(new Error(`Album not found: ${albumId}`));
		}

		return ok(localAlbumToAlbum(localAlbum));
	}

	async getArtistInfo(artistId: string): AsyncResult<Artist, Error> {
		const state = useLocalLibraryStore.getState();
		const localArtist = state.artists[artistId];

		if (!localArtist) {
			return err(new Error(`Artist not found: ${artistId}`));
		}

		return ok(localArtistToArtist(localArtist));
	}

	async getAlbumTracks(
		albumId: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Track>, Error> {
		try {
			const state = useLocalLibraryStore.getState();
			const tracks = state.getTracksByAlbum(albumId).map(localTrackToTrack);

			tracks.sort((a, b) => {
				const aNum = a.metadata.trackNumber ?? 0;
				const bNum = b.metadata.trackNumber ?? 0;
				return aNum - bNum;
			});

			return ok(this._paginate(tracks, options));
		} catch (error) {
			return err(error instanceof Error ? error : new Error(`Failed to get album tracks`));
		}
	}

	async getArtistAlbums(
		artistId: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Album>, Error> {
		try {
			const state = useLocalLibraryStore.getState();
			const albums = state.getAlbumsByArtist(artistId).map(localAlbumToAlbum);
			return ok(this._paginate(albums, options));
		} catch (error) {
			return err(error instanceof Error ? error : new Error(`Failed to get artist albums`));
		}
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// AudioSourceProvider Implementation
	// ─────────────────────────────────────────────────────────────────────────────

	async getStreamUrl(
		trackId: TrackId,
		_options?: StreamOptions
	): AsyncResult<AudioStream, Error> {
		const state = useLocalLibraryStore.getState();
		const localTrack = state.tracks[trackId.sourceId];

		if (!localTrack) {
			return err(new Error(`Track not found: ${trackId.value}`));
		}

		const format = this._getFormatFromPath(localTrack.filePath);

		return ok(
			createAudioStream({
				url: localTrack.filePath,
				format,
				quality: 'high',
				contentLength: localTrack.fileSize,
			})
		);
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// Folder Management (Public API)
	// ─────────────────────────────────────────────────────────────────────────────

	getFolders(): FolderInfo[] {
		return useLocalLibraryStore.getState().folders;
	}

	isScanning(): boolean {
		return this._isScanning;
	}

	getScanProgress(): ScanProgress | null {
		return this._scanProgress;
	}

	getLibraryStats(): { trackCount: number; albumCount: number; artistCount: number } {
		const state = useLocalLibraryStore.getState();
		return {
			trackCount: Object.keys(state.tracks).length,
			albumCount: Object.keys(state.albums).length,
			artistCount: Object.keys(state.artists).length,
		};
	}

	async pickAndAddFiles(
		onProgress?: (progress: ScanProgress) => void
	): AsyncResult<number, Error> {
		if (this._isScanning) {
			return err(new Error('Scan already in progress'));
		}

		try {
			this._isScanning = true;
			const store = useLocalLibraryStore.getState();

			// Pick audio files
			const pickResult = await pickAudioFiles();
			if (!pickResult.success) {
				this._isScanning = false;
				return err(pickResult.error);
			}

			const files = pickResult.data;
			if (files.length === 0) {
				this._isScanning = false;
				return ok(0);
			}

			// Create throttled progress callback to reduce re-renders
			const throttledProgress = _createThrottledProgress(onProgress, PROGRESS_THROTTLE_MS);

			// Process files in parallel batches for better performance
			const localTracks = await _processBatched(
				files,
				async (file, index) => {
					throttledProgress({
						current: index + 1,
						total: files.length,
						currentFile: file.name,
						phase: 'scanning',
					});

					// Parse metadata
					const metadataResult = await parseAudioMetadata(file.uri);
					const metadata = metadataResult.success ? metadataResult.data : { duration: 0 };

					// Cache artwork if present
					let artworkPath: string | undefined;
					if (metadataResult.success && metadata.artwork) {
						const cachedPath = await cacheArtwork(
							file.uri,
							metadata.artwork.data,
							metadata.artwork.mimeType
						);
						artworkPath = cachedPath ?? undefined;
					}

					return mapToLocalTrack(file, metadata, artworkPath);
				},
				BATCH_CONCURRENCY
			);

			// Batch add tracks to store
			store.addTracks(localTracks);

			// Index in database
			this._scanProgress = {
				current: files.length,
				total: files.length,
				phase: 'indexing',
			};
			onProgress?.(this._scanProgress);

			await indexTracks(localTracks);

			// Rebuild albums and artists
			rebuildAlbumsAndArtists();

			this._scanProgress = {
				current: files.length,
				total: files.length,
				phase: 'complete',
			};
			onProgress?.(this._scanProgress);

			this._isScanning = false;
			this._scanProgress = null;

			return ok(localTracks.length);
		} catch (error) {
			this._isScanning = false;
			this._scanProgress = null;
			return err(error instanceof Error ? error : new Error(`Scan failed: ${String(error)}`));
		}
	}

	async addFolder(
		folderUri: string,
		folderName: string,
		onProgress?: (progress: ScanProgress) => void
	): AsyncResult<number, Error> {
		if (this._isScanning) {
			logger.warn('Scan already in progress, ignoring addFolder request');
			return err(new Error('Scan already in progress'));
		}

		logger.info(`Adding folder: ${folderName} (${folderUri})`);

		try {
			this._isScanning = true;
			const store = useLocalLibraryStore.getState();
			store.setIsScanning(true);

			// Add folder to store
			store.addFolder({
				uri: folderUri,
				name: folderName,
				trackCount: 0,
				lastScannedAt: null,
			});

			// Scan folder for audio files
			this._scanProgress = {
				current: 0,
				total: 0,
				phase: 'enumerating',
			};
			store.setScanProgress(this._scanProgress);
			onProgress?.(this._scanProgress);

			logger.debug('Starting folder enumeration...');
			const scanResult = await scanFolderFiles(folderUri, {
				recursive: true,
				onProgress: (scanned, current) => {
					this._scanProgress = {
						current: scanned,
						total: scanned,
						currentFile: current,
						phase: 'enumerating',
					};
					store.setScanProgress(this._scanProgress);
					onProgress?.(this._scanProgress!);
				},
			});

			if (!scanResult.success) {
				logger.error('Folder scan failed', scanResult.error);
				this._isScanning = false;
				store.setIsScanning(false);
				store.setScanProgress(null);
				return err(scanResult.error);
			}

			const files = scanResult.data;
			logger.info(`Found ${files.length} audio file(s) to process`);

			if (files.length === 0) {
				logger.info('No audio files found in folder');
				store.updateFolderScanTime(folderUri);
				this._isScanning = false;
				store.setIsScanning(false);
				store.setScanProgress(null);
				return ok(0);
			}

			// Create throttled progress callback to reduce re-renders
			const throttledProgress = _createThrottledProgress(onProgress, PROGRESS_THROTTLE_MS);
			let lastStoreUpdate = 0;

			// Process files in parallel batches for better performance
			const localTracks = await _processBatched(
				files,
				async (file, index) => {
					const now = Date.now();

					// Throttle store updates to reduce Zustand re-renders
					if (now - lastStoreUpdate >= PROGRESS_THROTTLE_MS) {
						this._scanProgress = {
							current: index + 1,
							total: files.length,
							currentFile: file.name,
							phase: 'scanning',
						};
						store.setScanProgress(this._scanProgress);
						lastStoreUpdate = now;
					}

					throttledProgress({
						current: index + 1,
						total: files.length,
						currentFile: file.name,
						phase: 'scanning',
					});

					// Parse metadata
					const metadataResult = await parseAudioMetadata(file.uri);
					const metadata = metadataResult.success ? metadataResult.data : { duration: 0 };

					if (!metadataResult.success) {
						logger.debug(
							`Failed to parse metadata for ${file.name}: ${metadataResult.error.message}`
						);
					}

					// Cache artwork if present
					let artworkPath: string | undefined;
					if (metadataResult.success && metadata.artwork) {
						logger.debug(`Artwork found for ${file.name}, caching...`);
						const trackId = generateLocalTrackId(file.uri);
						const cachedPath = await cacheArtwork(
							trackId,
							metadata.artwork.data,
							metadata.artwork.mimeType
						);
						artworkPath = cachedPath ?? undefined;
						if (artworkPath) {
							logger.debug(`Artwork cached at: ${artworkPath}`);
						} else {
							logger.warn(`Failed to cache artwork for ${file.name}`);
						}
					}

					return mapToLocalTrack(file, metadata, artworkPath);
				},
				BATCH_CONCURRENCY
			);

			logger.info(`Processed ${localTracks.length} tracks, adding to store...`);

			// Batch add tracks to store
			store.addTracks(localTracks);

			// Index in database
			this._scanProgress = {
				current: files.length,
				total: files.length,
				phase: 'indexing',
			};
			store.setScanProgress(this._scanProgress);
			onProgress?.(this._scanProgress);

			logger.debug('Indexing tracks in database...');
			await indexTracks(localTracks);

			// Rebuild albums and artists
			logger.debug('Rebuilding albums and artists...');
			rebuildAlbumsAndArtists();

			// Update folder metadata
			store.updateFolderScanTime(folderUri);
			store.updateFolderTrackCount(folderUri, localTracks.length);

			this._scanProgress = {
				current: files.length,
				total: files.length,
				phase: 'complete',
			};
			store.setScanProgress(this._scanProgress);
			onProgress?.(this._scanProgress);

			this._isScanning = false;
			this._scanProgress = null;
			store.setIsScanning(false);
			store.setScanProgress(null);

			logger.info(`Successfully added ${localTracks.length} tracks from ${folderName}`);
			return ok(localTracks.length);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.error(`Scan failed: ${message}`, error instanceof Error ? error : undefined);

			this._isScanning = false;
			this._scanProgress = null;
			const store = useLocalLibraryStore.getState();
			store.setIsScanning(false);
			store.setScanProgress(null);

			return err(error instanceof Error ? error : new Error(`Scan failed: ${String(error)}`));
		}
	}

	async removeFolder(folderUri: string): AsyncResult<void, Error> {
		try {
			const store = useLocalLibraryStore.getState();

			// Remove tracks for this folder from store
			store.removeTracksForFolder(folderUri);

			// Remove from database
			await removeTracksFromDb(folderUri);

			// Remove folder from store
			store.removeFolder(folderUri);

			// Rebuild albums and artists
			rebuildAlbumsAndArtists();

			return ok(undefined);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to remove folder: ${String(error)}`)
			);
		}
	}

	async rescanFolder(
		folderUri: string,
		onProgress?: (progress: ScanProgress) => void
	): AsyncResult<number, Error> {
		if (this._isScanning) {
			logger.warn('Scan already in progress, ignoring rescanFolder request');
			return err(new Error('Scan already in progress'));
		}

		logger.info(`Rescanning folder: ${folderUri}`);

		try {
			this._isScanning = true;
			const store = useLocalLibraryStore.getState();
			store.setIsScanning(true);

			// Remove existing tracks for this folder (but keep folder in store)
			logger.debug('Removing existing tracks for folder...');
			store.removeTracksForFolder(folderUri);
			await removeTracksFromDb(folderUri);

			// Scan folder for audio files
			this._scanProgress = {
				current: 0,
				total: 0,
				phase: 'enumerating',
			};
			store.setScanProgress(this._scanProgress);
			onProgress?.(this._scanProgress);

			logger.debug('Starting folder enumeration...');
			const scanResult = await scanFolderFiles(folderUri, {
				recursive: true,
				onProgress: (scanned, current) => {
					this._scanProgress = {
						current: scanned,
						total: scanned,
						currentFile: current,
						phase: 'enumerating',
					};
					store.setScanProgress(this._scanProgress);
					onProgress?.(this._scanProgress!);
				},
			});

			if (!scanResult.success) {
				logger.error('Folder rescan failed', scanResult.error);
				this._isScanning = false;
				store.setIsScanning(false);
				store.setScanProgress(null);
				return err(scanResult.error);
			}

			const files = scanResult.data;
			logger.info(`Found ${files.length} audio file(s) to process`);

			if (files.length === 0) {
				logger.info('No audio files found in folder');
				store.updateFolderScanTime(folderUri);
				this._isScanning = false;
				store.setIsScanning(false);
				store.setScanProgress(null);
				return ok(0);
			}

			// Create throttled progress callback to reduce re-renders
			const throttledProgress = _createThrottledProgress(onProgress, PROGRESS_THROTTLE_MS);
			let lastStoreUpdate = 0;

			// Process files in parallel batches for better performance
			const localTracks = await _processBatched(
				files,
				async (file, index) => {
					const now = Date.now();

					// Throttle store updates to reduce Zustand re-renders
					if (now - lastStoreUpdate >= PROGRESS_THROTTLE_MS) {
						this._scanProgress = {
							current: index + 1,
							total: files.length,
							currentFile: file.name,
							phase: 'scanning',
						};
						store.setScanProgress(this._scanProgress);
						lastStoreUpdate = now;
					}

					throttledProgress({
						current: index + 1,
						total: files.length,
						currentFile: file.name,
						phase: 'scanning',
					});

					const metadataResult = await parseAudioMetadata(file.uri);
					const metadata = metadataResult.success ? metadataResult.data : { duration: 0 };

					if (!metadataResult.success) {
						logger.debug(
							`Failed to parse metadata for ${file.name}: ${metadataResult.error.message}`
						);
					}

					let artworkPath: string | undefined;
					if (metadataResult.success && metadata.artwork) {
						const trackId = generateLocalTrackId(file.uri);
						const cachedPath = await cacheArtwork(
							trackId,
							metadata.artwork.data,
							metadata.artwork.mimeType
						);
						artworkPath = cachedPath ?? undefined;
					}

					return mapToLocalTrack(file, metadata, artworkPath);
				},
				BATCH_CONCURRENCY
			);

			logger.info(`Processed ${localTracks.length} tracks, adding to store...`);
			store.addTracks(localTracks);

			this._scanProgress = {
				current: files.length,
				total: files.length,
				phase: 'indexing',
			};
			store.setScanProgress(this._scanProgress);
			onProgress?.(this._scanProgress);

			logger.debug('Indexing tracks in database...');
			await indexTracks(localTracks);
			rebuildAlbumsAndArtists();
			store.updateFolderScanTime(folderUri);
			store.updateFolderTrackCount(folderUri, localTracks.length);

			this._scanProgress = {
				current: files.length,
				total: files.length,
				phase: 'complete',
			};
			store.setScanProgress(this._scanProgress);
			onProgress?.(this._scanProgress);

			this._isScanning = false;
			this._scanProgress = null;
			store.setIsScanning(false);
			store.setScanProgress(null);

			logger.info(`Successfully rescanned folder: ${localTracks.length} tracks found`);
			return ok(localTracks.length);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.error(`Rescan failed: ${message}`, error instanceof Error ? error : undefined);

			this._isScanning = false;
			this._scanProgress = null;
			const store = useLocalLibraryStore.getState();
			store.setIsScanning(false);
			store.setScanProgress(null);

			return err(
				error instanceof Error ? error : new Error(`Rescan failed: ${String(error)}`)
			);
		}
	}

	async rescanAll(onProgress?: (progress: ScanProgress) => void): AsyncResult<number, Error> {
		const folders = this.getFolders();
		let totalTracks = 0;

		for (const folder of folders) {
			const result = await this.rescanFolder(folder.uri, onProgress);
			if (result.success) {
				totalTracks += result.data;
			}
		}

		return ok(totalTracks);
	}

	async clearLibrary(): AsyncResult<void, Error> {
		try {
			const store = useLocalLibraryStore.getState();
			store.clearLibrary();
			return ok(undefined);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to clear library: ${String(error)}`)
			);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// Private Helpers
	// ─────────────────────────────────────────────────────────────────────────────

	private _paginate<T>(items: T[], options?: SearchOptions): SearchResults<T> {
		const limit = options?.limit ?? 50;
		const offset = options?.offset ?? 0;
		const paginatedItems = items.slice(offset, offset + limit);

		return {
			items: paginatedItems,
			total: items.length,
			offset,
			limit,
			hasMore: offset + limit < items.length,
		};
	}

	private _getFormatFromPath(
		filePath: string
	): 'mp3' | 'aac' | 'opus' | 'flac' | 'webm' | 'ogg' | 'm4a' | 'wav' {
		const ext = filePath.split('.').pop()?.toLowerCase();
		const validFormats = ['mp3', 'aac', 'opus', 'flac', 'webm', 'ogg', 'm4a', 'wav'] as const;

		if (ext && validFormats.includes(ext as (typeof validFormats)[number])) {
			return ext as (typeof validFormats)[number];
		}

		return 'mp3';
	}
}
