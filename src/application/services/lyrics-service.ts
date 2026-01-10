import type { MetadataProvider, Lyrics } from '../../plugins/core/interfaces/metadata-provider';
import type { TrackId } from '../../domain/value-objects/track-id';
import { ok, type Result } from '../../shared/types/result';
import { getLogger } from '../../shared/services/logger';

const logger = getLogger('LyricsService');

interface CacheEntry {
	lyrics: Lyrics | null;
	timestamp: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class LyricsService {
	private metadataProviders: MetadataProvider[] = [];
	private pendingRequests = new Map<string, Promise<Result<Lyrics | null, Error>>>();
	private lyricsCache = new Map<string, CacheEntry>();

	setMetadataProviders(providers: MetadataProvider[]): void {
		this.metadataProviders = providers;
		this.clearCache();
	}

	addMetadataProvider(provider: MetadataProvider): void {
		if (!this.metadataProviders.includes(provider)) {
			this.metadataProviders.push(provider);
			this.clearCache();
		}
	}

	removeMetadataProvider(providerId: string): void {
		this.metadataProviders = this.metadataProviders.filter((p) => p.manifest.id !== providerId);
		this.clearCache();
	}

	clearCache(): void {
		this.lyricsCache.clear();
		logger.debug('Lyrics cache cleared');
	}

	async getLyrics(trackId: TrackId): Promise<Result<Lyrics | null, Error>> {
		const cacheKey = trackId.value;

		const cachedEntry = this.lyricsCache.get(cacheKey);
		if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
			logger.debug(`Returning cached lyrics for track: ${cacheKey}`);
			return ok(cachedEntry.lyrics);
		}

		const pendingRequest = this.pendingRequests.get(cacheKey);
		if (pendingRequest) {
			logger.debug(`Deduplicating lyrics request for track: ${cacheKey}`);
			return pendingRequest;
		}

		const fetchPromise = this._fetchLyrics(trackId, cacheKey);
		this.pendingRequests.set(cacheKey, fetchPromise);

		try {
			return await fetchPromise;
		} finally {
			this.pendingRequests.delete(cacheKey);
		}
	}

	private async _fetchLyrics(
		trackId: TrackId,
		cacheKey: string
	): Promise<Result<Lyrics | null, Error>> {
		const providersWithLyrics = this.metadataProviders.filter(
			(p) => p.hasCapability('get-lyrics') && p.getLyrics
		);

		if (providersWithLyrics.length === 0) {
			logger.debug('No providers with lyrics capability available');
			return ok(null);
		}

		for (const provider of providersWithLyrics) {
			try {
				logger.debug(`Fetching lyrics from provider: ${provider.manifest.id}`);
				const result = await provider.getLyrics!(trackId);

				if (result.success && result.data) {
					logger.debug(`Got lyrics from provider: ${provider.manifest.id}`);

					this.lyricsCache.set(cacheKey, {
						lyrics: result.data,
						timestamp: Date.now(),
					});

					return ok(result.data);
				}
			} catch (error) {
				logger.warn(
					`Lyrics fetch failed for provider ${provider.manifest.id}`,
					error instanceof Error ? error : undefined
				);
			}
		}

		this.lyricsCache.set(cacheKey, {
			lyrics: null,
			timestamp: Date.now(),
		});

		return ok(null);
	}

	findCurrentLineIndex(lyrics: Lyrics, positionMs: number): number {
		if (!lyrics.syncedLyrics || lyrics.syncedLyrics.length === 0) {
			return -1;
		}

		const lines = lyrics.syncedLyrics;

		// Binary search for the current line
		let left = 0;
		let right = lines.length - 1;
		let result = -1;

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const line = lines[mid];

			if (line.startTime <= positionMs) {
				result = mid;
				left = mid + 1;
			} else {
				right = mid - 1;
			}
		}

		// Verify the line is still active (check endTime if available)
		if (result >= 0) {
			const line = lines[result];
			if (line.endTime !== undefined && positionMs > line.endTime) {
				// Position is past this line's end, but before next line
				// This can happen in gaps between lines
				return result;
			}
		}

		return result;
	}
}

export const lyricsService = new LyricsService();
