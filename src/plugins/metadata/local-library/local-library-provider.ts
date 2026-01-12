import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import { TrackId } from '@domain/value-objects/track-id';
import type { AudioStream } from '@domain/value-objects/audio-stream';
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
import type { AsyncResult } from '@shared/types/result';
import {
	PLUGIN_MANIFEST,
	METADATA_CAPABILITIES,
	AUDIO_CAPABILITIES,
	CONFIG_SCHEMA,
	DEFAULT_CONFIG,
	type LocalLibraryConfig,
} from './config';
import type { ScanProgress, FolderInfo } from './types';
import * as searchOps from './operations/search-operations';
import * as metadataOps from './operations/metadata-operations';
import * as folderOps from './operations/folder-operations';
import * as filePickerOps from './operations/file-picker-operations';
import * as libraryStats from './operations/library-stats';
import * as audioStreamOps from './operations/audio-stream-operations';
import { ScanStateManager } from './operations/scan-state-manager';
import { createLifecycleHandlers } from './lifecycle/plugin-lifecycle';

export class LocalLibraryProvider implements MetadataProvider, AudioSourceProvider {
	readonly manifest = PLUGIN_MANIFEST;
	readonly capabilities = new Set<MetadataCapability>(METADATA_CAPABILITIES);
	readonly audioCapabilities = new Set<AudioSourceCapability>(AUDIO_CAPABILITIES);
	readonly configSchema = CONFIG_SCHEMA;

	private readonly _config: LocalLibraryConfig;
	private readonly _scanStateManager = new ScanStateManager();
	private readonly _lifecycle = createLifecycleHandlers();

	constructor(config: LocalLibraryConfig = DEFAULT_CONFIG) {
		this._config = { ...DEFAULT_CONFIG, ...config };
	}

	get status(): PluginStatus {
		return this._lifecycle.status;
	}

	set status(value: PluginStatus) {
		this._lifecycle.status = value;
	}

	async onInit(context: PluginInitContext): AsyncResult<void, Error> {
		return this._lifecycle.onInit(context);
	}

	async onActivate(): AsyncResult<void, Error> {
		return this._lifecycle.onActivate();
	}

	async onDeactivate(): AsyncResult<void, Error> {
		return this._lifecycle.onDeactivate();
	}

	async onDestroy(): AsyncResult<void, Error> {
		return this._lifecycle.onDestroy();
	}

	hasCapability(capability: MetadataCapability): boolean {
		return this.capabilities.has(capability);
	}

	hasAudioCapability(capability: AudioSourceCapability): boolean {
		return this.audioCapabilities.has(capability);
	}

	supportsTrack(track: Track): boolean {
		const isLocalLibraryId =
			typeof track.id === 'object' && track.id.sourceType === 'local-library';
		const isLocalSource = track.source.type === 'local';
		return isLocalLibraryId || isLocalSource;
	}

	async searchTracks(
		query: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Track>, Error> {
		return searchOps.searchTracks(query, options);
	}

	async searchAlbums(
		query: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Album>, Error> {
		return searchOps.searchAlbums(query, options);
	}

	async searchArtists(
		query: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Artist>, Error> {
		return searchOps.searchArtists(query, options);
	}

	async getTrackInfo(trackId: TrackId): AsyncResult<Track, Error> {
		return metadataOps.getTrackInfo(trackId);
	}

	async getAlbumInfo(albumId: string): AsyncResult<Album, Error> {
		return metadataOps.getAlbumInfo(albumId);
	}

	async getArtistInfo(artistId: string): AsyncResult<Artist, Error> {
		return metadataOps.getArtistInfo(artistId);
	}

	async getAlbumTracks(
		albumId: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Track>, Error> {
		return metadataOps.getAlbumTracks(albumId, options);
	}

	async getArtistAlbums(
		artistId: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Album>, Error> {
		return metadataOps.getArtistAlbums(artistId, options);
	}

	async getStreamUrl(
		trackId: TrackId,
		options?: StreamOptions
	): AsyncResult<AudioStream, Error> {
		return audioStreamOps.getStreamUrl(trackId, options);
	}

	getFolders(): FolderInfo[] {
		return libraryStats.getFolders();
	}

	isScanning(): boolean {
		return this._scanStateManager.isScanning();
	}

	getScanProgress(): ScanProgress | null {
		return this._scanStateManager.getScanProgress();
	}

	getLibraryStats(): { trackCount: number; albumCount: number; artistCount: number } {
		return libraryStats.getLibraryStats();
	}

	async pickAndAddFiles(
		onProgress?: (progress: ScanProgress) => void
	): AsyncResult<number, Error> {
		return this._scanStateManager.executeWithScanLock(() =>
			filePickerOps.pickAndAddFiles(onProgress)
		);
	}

	async addFolder(
		folderUri: string,
		folderName: string,
		onProgress?: (progress: ScanProgress) => void
	): AsyncResult<number, Error> {
		return this._scanStateManager.executeWithScanLock(() =>
			folderOps.addFolder(folderUri, folderName, onProgress)
		);
	}

	async removeFolder(folderUri: string): AsyncResult<void, Error> {
		return folderOps.removeFolder(folderUri);
	}

	async rescanFolder(
		folderUri: string,
		onProgress?: (progress: ScanProgress) => void
	): AsyncResult<number, Error> {
		return this._scanStateManager.executeWithScanLock(() =>
			folderOps.rescanFolder(folderUri, onProgress)
		);
	}

	async rescanAll(onProgress?: (progress: ScanProgress) => void): AsyncResult<number, Error> {
		const folders = this.getFolders();
		return folderOps.rescanAllFolders(folders, onProgress);
	}

	async clearLibrary(): AsyncResult<void, Error> {
		return libraryStats.clearLibrary();
	}
}
