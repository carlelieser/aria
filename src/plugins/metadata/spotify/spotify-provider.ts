import type {
	MetadataCapability,
	MetadataProvider,
	SearchResults,
} from '@plugins/core/interfaces/metadata-provider';
import { createSearchResults } from '@plugins/core/interfaces/metadata-provider';
import {
	mapProxyAlbumTracks,
	mapProxyAlbum,
	mapProxyArtistOverview,
	mapProxyArtistAlbums,
} from './proxy-mappers';
import type { OAuthCapablePlugin } from '@plugins/core/interfaces/oauth-capable-plugin';
import type { PluginInitContext, PluginStatus } from '@plugins/core/interfaces/base-plugin';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';

import { PLUGIN_MANIFEST, CONFIG_SCHEMA, METADATA_CAPABILITIES } from './config';
import { SpotifyClient, createSpotifyClient, type SpotifyClientConfig } from './client';
import { createImportOperations, type ImportOperations } from './import-operations';

/**
 * Only library import is available for Spotify (via the spot-api proxy). Search,
 * catalog info, and recommendations require direct Spotify API access that is no
 * longer reachable from the app.
 */
const NOT_SUPPORTED_ERROR = new Error(
	'Spotify supports library import only; search and catalog browsing are unavailable'
);

export interface SpotifyLibraryProvider extends MetadataProvider, OAuthCapablePlugin {
	readonly import: ImportOperations;

	getClient(): SpotifyClient;
}

export class SpotifyProvider implements SpotifyLibraryProvider {
	readonly manifest = PLUGIN_MANIFEST;
	readonly configSchema = CONFIG_SCHEMA;
	readonly capabilities = new Set<MetadataCapability>(METADATA_CAPABILITIES);

	status: PluginStatus = 'uninitialized';

	private config: SpotifyClientConfig;
	private client: SpotifyClient | null = null;
	private importOps: ImportOperations | null = null;

	constructor(config: SpotifyClientConfig = {}) {
		this.config = config;
	}

	get import(): ImportOperations {
		if (!this.importOps) {
			throw new Error('Plugin not initialized');
		}
		return this.importOps;
	}

	async onInit(context: PluginInitContext): Promise<Result<void, Error>> {
		try {
			this.status = 'initializing';

			const mergedConfig: SpotifyClientConfig = {
				market: (context.config.market as string) || this.config.market || 'US',
			};

			this.client = createSpotifyClient(mergedConfig);
			// Only library import is supported via the spot-api proxy. Search,
			// info, recommendations and home-feed require direct Spotify API
			// access that is no longer available; they remain unbuilt and their
			// provider methods return NOT_SUPPORTED_ERROR.
			this.importOps = createImportOperations(
				this.client.getAuthManager(),
				this.client.getProxyClient()
			);

			await this.client.initialize();

			this.status = 'ready';
			return ok(undefined);
		} catch (error) {
			this.status = 'error';
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to initialize Spotify client: ${String(error)}`)
			);
		}
	}

	async onActivate(): Promise<Result<void, Error>> {
		this.status = 'active';
		return ok(undefined);
	}

	async onDeactivate(): Promise<Result<void, Error>> {
		this.status = 'ready';
		return ok(undefined);
	}

	async onDestroy(): Promise<Result<void, Error>> {
		this.client?.destroy();
		this.client = null;
		this.importOps = null;
		this.status = 'uninitialized';
		return ok(undefined);
	}

	hasCapability(capability: MetadataCapability): boolean {
		return this.capabilities.has(capability);
	}

	getClient(): SpotifyClient {
		if (!this.client) {
			throw new Error('Plugin not initialized');
		}
		return this.client;
	}

	isAuthenticated(): boolean {
		return this.client?.isAuthenticated() ?? false;
	}

	async checkAuthentication(): Promise<boolean> {
		if (!this.client) {
			return false;
		}
		return this.client.checkAuthentication();
	}

	getLoginUrl(): string {
		if (!this.client) {
			throw new Error('Plugin not initialized');
		}
		return this.client.getAuthManager().getLoginUrl();
	}

	async setCredential(credential: string): Promise<Result<void, Error>> {
		if (!this.client) {
			return err(new Error('Plugin not initialized'));
		}
		// `credential` is the `sp_dc` session cookie captured by the login
		// WebView; the account identifier is resolved from it by the proxy.
		return this.client.getAuthManager().setSession(credential);
	}

	async logout(): Promise<Result<void, Error>> {
		if (!this.client) {
			return err(new Error('Plugin not initialized'));
		}
		return this.client.getAuthManager().logout();
	}

	// --- Unsupported catalog operations ---
	// Search, info, and recommendations required direct Spotify API access,
	// which is no longer reachable. These satisfy the MetadataProvider contract
	// but always return NOT_SUPPORTED_ERROR.

	searchTracks(): Promise<Result<SearchResults<Track>, Error>> {
		return Promise.resolve(err(NOT_SUPPORTED_ERROR));
	}

	searchAlbums(): Promise<Result<SearchResults<Album>, Error>> {
		return Promise.resolve(err(NOT_SUPPORTED_ERROR));
	}

	searchArtists(): Promise<Result<SearchResults<Artist>, Error>> {
		return Promise.resolve(err(NOT_SUPPORTED_ERROR));
	}

	searchPlaylists(): Promise<Result<SearchResults<Playlist>, Error>> {
		return Promise.resolve(err(NOT_SUPPORTED_ERROR));
	}

	getTrackInfo(): Promise<Result<Track, Error>> {
		return Promise.resolve(err(NOT_SUPPORTED_ERROR));
	}

	async getAlbumInfo(albumId: string): Promise<Result<Album, Error>> {
		if (!this.client) {
			return err(new Error('Plugin not initialized'));
		}
		const session = this.client.getAuthManager().getSession();
		if (!session) {
			return err(new Error('Not authenticated with Spotify'));
		}

		const result = await this.client.getProxyClient().getAlbumPage(session, albumId);
		if (!result.success) return err(result.error);

		const albumData = (result.data as { album?: Record<string, unknown> }).album;
		const album = albumData ? mapProxyAlbum(albumData) : null;
		if (!album) {
			return err(new Error('Album not found'));
		}
		return ok(album);
	}

	async getArtistInfo(artistId: string): Promise<Result<Artist, Error>> {
		if (!this.client) {
			return err(new Error('Plugin not initialized'));
		}
		const session = this.client.getAuthManager().getSession();
		if (!session) {
			return err(new Error('Not authenticated with Spotify'));
		}

		const result = await this.client.getProxyClient().getArtistInfo(session, artistId);
		if (!result.success) return err(result.error);

		const artist = mapProxyArtistOverview(result.data as Record<string, unknown>);
		if (!artist) return err(new Error('Failed to map artist'));
		return ok(artist);
	}

	getPlaylistInfo(): Promise<Result<Playlist, Error>> {
		return Promise.resolve(err(NOT_SUPPORTED_ERROR));
	}

	async getAlbumTracks(albumId: string): Promise<Result<SearchResults<Track>, Error>> {
		if (!this.client) {
			return err(new Error('Plugin not initialized'));
		}
		const session = this.client.getAuthManager().getSession();
		if (!session) {
			return err(new Error('Not authenticated with Spotify'));
		}

		const result = await this.client.getProxyClient().getAllAlbumTracks(session, albumId);
		if (!result.success) return err(result.error);

		const tracks = mapProxyAlbumTracks(result.data, undefined, []);
		return ok(
			createSearchResults(tracks, {
				total: tracks.length,
				offset: 0,
				limit: tracks.length,
				hasMore: false,
			})
		);
	}

	async getArtistAlbums(artistId: string): Promise<Result<SearchResults<Album>, Error>> {
		if (!this.client) {
			return err(new Error('Plugin not initialized'));
		}
		const session = this.client.getAuthManager().getSession();
		if (!session) {
			return err(new Error('Not authenticated with Spotify'));
		}

		const result = await this.client.getProxyClient().getAllArtistAlbums(session, artistId);
		if (!result.success) return err(result.error);

		const albums = mapProxyArtistAlbums(result.data);
		return ok(
			createSearchResults(albums, {
				total: albums.length,
				offset: 0,
				limit: albums.length,
				hasMore: false,
			})
		);
	}

	batchGetTracks(): Promise<Result<Track[], Error>> {
		return Promise.resolve(err(NOT_SUPPORTED_ERROR));
	}

	batchGetAlbums(): Promise<Result<Album[], Error>> {
		return Promise.resolve(err(NOT_SUPPORTED_ERROR));
	}

	getRecommendations(): Promise<Result<Track[], Error>> {
		return Promise.resolve(err(NOT_SUPPORTED_ERROR));
	}
}

export function createSpotifyProvider(config: SpotifyClientConfig = {}): SpotifyProvider {
	return new SpotifyProvider(config);
}
