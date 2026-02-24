import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CachedService } from '@shared/cache/cached-service';
import { ok, err, type Result } from '@shared/types/result';

function createMockLogger() {
	return {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};
}

describe('CachedService', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('getOrFetch', () => {
		it('should call fetcher on cache miss', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi.fn().mockResolvedValue(ok('data'));

			await service.getOrFetch('key1', fetcher);

			expect(fetcher).toHaveBeenCalledOnce();
		});

		it('should return fetcher result on cache miss', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi.fn().mockResolvedValue(ok('hello'));

			const result = await service.getOrFetch('key1', fetcher);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe('hello');
			}
		});

		it('should return cached result on cache hit', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi.fn().mockResolvedValue(ok('data'));

			await service.getOrFetch('key1', fetcher);
			const result = await service.getOrFetch('key1', fetcher);

			expect(fetcher).toHaveBeenCalledOnce();
			expect(result.success).toBe(true);
		});

		it('should call onCacheHit callback on cache hit', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi.fn().mockResolvedValue(ok('data'));
			const onCacheHit = vi.fn();

			await service.getOrFetch('key1', fetcher);
			await service.getOrFetch('key1', fetcher, onCacheHit);

			expect(onCacheHit).toHaveBeenCalledWith('data');
		});

		it('should re-fetch after TTL expires', async () => {
			const service = new CachedService<string, string>({ ttlMs: 5000 });
			const fetcher = vi
				.fn()
				.mockResolvedValueOnce(ok('first'))
				.mockResolvedValueOnce(ok('second'));

			await service.getOrFetch('key1', fetcher);

			vi.advanceTimersByTime(6000);

			const result = await service.getOrFetch('key1', fetcher);

			expect(fetcher).toHaveBeenCalledTimes(2);
			if (result.success) {
				expect(result.data).toBe('second');
			}
		});

		it('should not cache error results', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi
				.fn()
				.mockResolvedValueOnce(err(new Error('fail')))
				.mockResolvedValueOnce(ok('success'));

			await service.getOrFetch('key1', fetcher);
			const result = await service.getOrFetch('key1', fetcher);

			expect(fetcher).toHaveBeenCalledTimes(2);
			expect(result.success).toBe(true);
		});

		it('should deduplicate concurrent requests for the same key', async () => {
			const service = new CachedService<string, string>();
			let resolvePromise!: (value: Result<string, Error>) => void;
			const fetcher = vi.fn().mockReturnValue(
				new Promise<Result<string, Error>>((resolve) => {
					resolvePromise = resolve;
				})
			);

			const promise1 = service.getOrFetch('key1', fetcher);
			const promise2 = service.getOrFetch('key1', fetcher);

			resolvePromise(ok('deduplicated'));

			const [result1, result2] = await Promise.all([promise1, promise2]);

			expect(fetcher).toHaveBeenCalledOnce();
			expect(result1).toEqual(result2);
		});

		it('should use default TTL when not specified', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi.fn().mockResolvedValue(ok('data'));

			await service.getOrFetch('key1', fetcher);

			// Default TTL is 10 minutes (600_000 ms)
			vi.advanceTimersByTime(9 * 60 * 1000);
			await service.getOrFetch('key1', fetcher);
			expect(fetcher).toHaveBeenCalledOnce();

			vi.advanceTimersByTime(2 * 60 * 1000);
			await service.getOrFetch('key1', fetcher);
			expect(fetcher).toHaveBeenCalledTimes(2);
		});

		it('should log cache hit when logger is provided', async () => {
			const logger = createMockLogger();
			const service = new CachedService<string, string>({
				logger,
				name: 'TestCache',
			});
			const fetcher = vi.fn().mockResolvedValue(ok('data'));

			await service.getOrFetch('key1', fetcher);
			await service.getOrFetch('key1', fetcher);

			expect(logger.debug).toHaveBeenCalledWith('[TestCache] Cache hit for: key1');
		});
	});

	describe('clearCache', () => {
		it('should clear all cached entries', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi.fn().mockResolvedValue(ok('data'));

			await service.getOrFetch('key1', fetcher);
			await service.getOrFetch('key2', fetcher);

			service.clearCache();

			expect(service.size).toBe(0);
		});

		it('should cause cache miss after clearing', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi.fn().mockResolvedValue(ok('data'));

			await service.getOrFetch('key1', fetcher);
			service.clearCache();
			await service.getOrFetch('key1', fetcher);

			expect(fetcher).toHaveBeenCalledTimes(2);
		});
	});

	describe('invalidate', () => {
		it('should remove specific key from cache', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi.fn().mockResolvedValue(ok('data'));

			await service.getOrFetch('key1', fetcher);
			await service.getOrFetch('key2', fetcher);

			service.invalidate('key1');

			expect(service.has('key1')).toBe(false);
			expect(service.has('key2')).toBe(true);
		});

		it('should not throw when invalidating non-existent key', () => {
			const service = new CachedService<string, string>();

			expect(() => service.invalidate('nonexistent')).not.toThrow();
		});
	});

	describe('has', () => {
		it('should return true when key is cached and not expired', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi.fn().mockResolvedValue(ok('data'));

			await service.getOrFetch('key1', fetcher);

			expect(service.has('key1')).toBe(true);
		});

		it('should return false when key is not cached', () => {
			const service = new CachedService<string, string>();

			expect(service.has('key1')).toBe(false);
		});

		it('should return false when key is expired', async () => {
			const service = new CachedService<string, string>({ ttlMs: 1000 });
			const fetcher = vi.fn().mockResolvedValue(ok('data'));

			await service.getOrFetch('key1', fetcher);
			vi.advanceTimersByTime(2000);

			expect(service.has('key1')).toBe(false);
		});
	});

	describe('size', () => {
		it('should return 0 for empty cache', () => {
			const service = new CachedService<string, string>();

			expect(service.size).toBe(0);
		});

		it('should return number of cached entries', async () => {
			const service = new CachedService<string, string>();
			const fetcher = vi.fn().mockResolvedValue(ok('data'));

			await service.getOrFetch('key1', fetcher);
			await service.getOrFetch('key2', fetcher);

			expect(service.size).toBe(2);
		});
	});
});
