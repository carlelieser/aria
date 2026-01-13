import type { Track } from '@domain/entities/track';
import type { Lyrics } from '../../core/interfaces/metadata-provider';
import type { LyricsProvider, LyricsSearchParams } from '../domain/lyrics-provider';
import type { PluginLogger } from '../../core/interfaces/base-plugin';
import type { AsyncResult } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { LyricsCache } from './lyrics-cache';

export interface LyricsOrchestratorOptions {
	readonly cache?: LyricsCache;
	readonly logger?: PluginLogger;
	readonly preferSyncedLyrics?: boolean;
}

export class LyricsOrchestrator {
	private readonly _providers = new Map<string, LyricsProvider>();
	private readonly _cache: LyricsCache;
	private readonly _logger?: PluginLogger;
	private readonly _pendingRequests = new Map<string, Promise<Lyrics | null>>();
	private _preferSyncedLyrics: boolean;

	constructor(options: LyricsOrchestratorOptions = {}) {
		this._cache = options.cache ?? new LyricsCache();
		this._logger = options.logger;
		this._preferSyncedLyrics = options.preferSyncedLyrics ?? true;
	}

	registerProvider(provider: LyricsProvider): void {
		this._providers.set(provider.id, provider);
		this._logger?.debug(`Registered lyrics provider: ${provider.id}`);
	}

	unregisterProvider(providerId: string): void {
		this._providers.delete(providerId);
		this._logger?.debug(`Unregistered lyrics provider: ${providerId}`);
	}

	getProvider(providerId: string): LyricsProvider | undefined {
		return this._providers.get(providerId);
	}

	getProviders(): LyricsProvider[] {
		return Array.from(this._providers.values());
	}

	getSortedProviders(): LyricsProvider[] {
		return this.getProviders()
			.filter((p) => p.enabled)
			.sort((a, b) => a.priority - b.priority);
	}

	setPreferSyncedLyrics(prefer: boolean): void {
		this._preferSyncedLyrics = prefer;
	}

	async getLyrics(track: Track): AsyncResult<Lyrics | null, Error> {
		const trackId = track.id.value;

		const cached = this._cache.get(trackId);
		if (cached !== undefined) {
			this._logger?.debug(`Cache hit for track: ${trackId}`);
			return ok(cached);
		}

		const pending = this._pendingRequests.get(trackId);
		if (pending) {
			this._logger?.debug(`Deduplicating request for track: ${trackId}`);
			const result = await pending;
			return ok(result);
		}

		const fetchPromise = this._fetchLyrics(track);
		this._pendingRequests.set(trackId, fetchPromise);

		try {
			const lyrics = await fetchPromise;
			return ok(lyrics);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		} finally {
			this._pendingRequests.delete(trackId);
		}
	}

	clearCache(): void {
		this._cache.clear();
		this._logger?.debug('Lyrics cache cleared');
	}

	getCache(): LyricsCache {
		return this._cache;
	}

	private async _fetchLyrics(track: Track): Promise<Lyrics | null> {
		const providers = this.getSortedProviders();
		const trackId = track.id.value;

		if (providers.length === 0) {
			this._logger?.debug('No enabled lyrics providers available');
			this._cache.set(trackId, null);
			return null;
		}

		const searchParams: LyricsSearchParams = {
			track,
			artist: track.artists[0]?.name,
			album: track.album?.name,
			duration: track.duration.totalMilliseconds,
		};

		for (const provider of providers) {
			if (!provider.canHandleTrack(track)) {
				this._logger?.debug(`Provider ${provider.id} cannot handle track: ${trackId}`);
				continue;
			}

			try {
				this._logger?.debug(`Fetching lyrics from provider: ${provider.id}`);
				const result = await provider.searchLyrics(searchParams);

				if (result.success && result.data) {
					const lyrics = result.data;

					if (this._preferSyncedLyrics && !lyrics.syncedLyrics?.length) {
						this._logger?.debug(
							`Provider ${provider.id} returned plain lyrics, trying next for synced`
						);
						continue;
					}

					this._logger?.debug(`Got lyrics from provider: ${provider.id}`);
					this._cache.set(trackId, lyrics, provider.id);
					return lyrics;
				}
			} catch (error) {
				this._logger?.warn(
					`Lyrics fetch failed for provider ${provider.id}`,
					error instanceof Error ? error : undefined
				);
			}
		}

		if (!this._preferSyncedLyrics) {
			this._cache.set(trackId, null);
			return null;
		}

		this._logger?.debug('No synced lyrics found, trying again for plain lyrics');
		for (const provider of providers) {
			if (!provider.canHandleTrack(track)) {
				continue;
			}

			try {
				const result = await provider.searchLyrics(searchParams);

				if (result.success && result.data) {
					this._logger?.debug(`Got plain lyrics from provider: ${provider.id}`);
					this._cache.set(trackId, result.data, provider.id);
					return result.data;
				}
			} catch {
				// Already logged in first pass
			}
		}

		this._cache.set(trackId, null);
		return null;
	}
}
