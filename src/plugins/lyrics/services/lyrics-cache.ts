import type { Lyrics } from '../../core/interfaces/metadata-provider';
import { DEFAULT_CACHE_TTL_MS } from '../core/config';

interface CacheEntry {
	readonly lyrics: Lyrics | null;
	readonly timestamp: number;
	readonly providerId?: string;
}

export class LyricsCache {
	private readonly _cache = new Map<string, CacheEntry>();
	private _ttlMs: number;

	constructor(ttlMs: number = DEFAULT_CACHE_TTL_MS) {
		this._ttlMs = ttlMs;
	}

	get(trackId: string): Lyrics | null | undefined {
		const entry = this._cache.get(trackId);

		if (!entry) {
			return undefined;
		}

		if (this._isExpired(entry)) {
			this._cache.delete(trackId);
			return undefined;
		}

		return entry.lyrics;
	}

	set(trackId: string, lyrics: Lyrics | null, providerId?: string): void {
		this._cache.set(trackId, {
			lyrics,
			timestamp: Date.now(),
			providerId,
		});
	}

	has(trackId: string): boolean {
		const entry = this._cache.get(trackId);

		if (!entry) {
			return false;
		}

		if (this._isExpired(entry)) {
			this._cache.delete(trackId);
			return false;
		}

		return true;
	}

	delete(trackId: string): boolean {
		return this._cache.delete(trackId);
	}

	clear(): void {
		this._cache.clear();
	}

	setTtl(ttlMs: number): void {
		this._ttlMs = ttlMs;
	}

	getTtl(): number {
		return this._ttlMs;
	}

	getStats(): { size: number; ttlMs: number } {
		this._pruneExpired();
		return {
			size: this._cache.size,
			ttlMs: this._ttlMs,
		};
	}

	private _isExpired(entry: CacheEntry): boolean {
		return Date.now() - entry.timestamp >= this._ttlMs;
	}

	private _pruneExpired(): void {
		const now = Date.now();
		for (const [key, entry] of this._cache.entries()) {
			if (now - entry.timestamp >= this._ttlMs) {
				this._cache.delete(key);
			}
		}
	}
}
