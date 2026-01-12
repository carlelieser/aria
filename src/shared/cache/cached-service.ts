import type { Result } from '../types/result';
import { ok } from '../types/result';
import type { Logger } from '../services/logger/types';

interface CacheEntry<T> {
	readonly result: T;
	readonly timestamp: number;
}

export interface CachedServiceOptions {
	readonly ttlMs?: number;
	readonly logger?: Logger;
	readonly name?: string;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;

export class CachedService<TKey extends string, TResult> {
	private readonly _cache = new Map<TKey, CacheEntry<TResult>>();
	private readonly _pendingRequests = new Map<TKey, Promise<Result<TResult, Error>>>();
	private readonly _ttlMs: number;
	private readonly _logger?: Logger;
	private readonly _name: string;

	constructor(options: CachedServiceOptions = {}) {
		this._ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
		this._logger = options.logger;
		this._name = options.name ?? 'CachedService';
	}

	async getOrFetch(
		key: TKey,
		fetcher: () => Promise<Result<TResult, Error>>,
		onCacheHit?: (result: TResult) => void
	): Promise<Result<TResult, Error>> {
		const cachedEntry = this._cache.get(key);
		if (cachedEntry && Date.now() - cachedEntry.timestamp < this._ttlMs) {
			this._logger?.debug(`[${this._name}] Cache hit for: ${key}`);
			onCacheHit?.(cachedEntry.result);
			return ok(cachedEntry.result);
		}

		const pendingRequest = this._pendingRequests.get(key);
		if (pendingRequest) {
			this._logger?.debug(`[${this._name}] Deduplicating request for: ${key}`);
			return pendingRequest;
		}

		const fetchPromise = this._executeFetch(key, fetcher);
		this._pendingRequests.set(key, fetchPromise);

		try {
			return await fetchPromise;
		} finally {
			this._pendingRequests.delete(key);
		}
	}

	private async _executeFetch(
		key: TKey,
		fetcher: () => Promise<Result<TResult, Error>>
	): Promise<Result<TResult, Error>> {
		const result = await fetcher();

		if (result.success) {
			this._cache.set(key, {
				result: result.data,
				timestamp: Date.now(),
			});
		}

		return result;
	}

	clearCache(): void {
		this._cache.clear();
		this._logger?.debug(`[${this._name}] Cache cleared`);
	}

	invalidate(key: TKey): void {
		this._cache.delete(key);
		this._logger?.debug(`[${this._name}] Invalidated: ${key}`);
	}

	has(key: TKey): boolean {
		const entry = this._cache.get(key);
		return entry !== undefined && Date.now() - entry.timestamp < this._ttlMs;
	}

	get size(): number {
		return this._cache.size;
	}
}
