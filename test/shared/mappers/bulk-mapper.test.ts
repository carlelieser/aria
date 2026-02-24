import { describe, it, expect } from 'vitest';
import {
	mapAndFilter,
	mapAndFilterWithIndex,
	mapAndFilterUndefined,
} from '@shared/mappers/bulk-mapper';

describe('bulk-mapper', () => {
	describe('mapAndFilter', () => {
		it('should map items and keep non-null results', () => {
			const items = [1, 2, 3, 4, 5];
			const mapper = (n: number) => (n > 3 ? n * 10 : null);

			const result = mapAndFilter(items, mapper);

			expect(result).toEqual([40, 50]);
		});

		it('should return empty array when all results are null', () => {
			const items = [1, 2, 3];
			const mapper = (_n: number) => null;

			const result = mapAndFilter(items, mapper);

			expect(result).toEqual([]);
		});

		it('should return all items when none are null', () => {
			const items = ['a', 'b', 'c'];
			const mapper = (s: string) => s.toUpperCase();

			const result = mapAndFilter(items, mapper);

			expect(result).toEqual(['A', 'B', 'C']);
		});

		it('should handle empty input array', () => {
			const result = mapAndFilter([], (x: number) => x);

			expect(result).toEqual([]);
		});

		it('should support type transformation', () => {
			const items = ['1', 'hello', '3'];
			const mapper = (s: string) => {
				const n = parseInt(s, 10);
				return isNaN(n) ? null : n;
			};

			const result = mapAndFilter(items, mapper);

			expect(result).toEqual([1, 3]);
		});
	});

	describe('mapAndFilterWithIndex', () => {
		it('should provide index to mapper function', () => {
			const items = ['a', 'b', 'c'];
			const mapper = (s: string, index: number) => `${index}:${s}`;

			const result = mapAndFilterWithIndex(items, mapper);

			expect(result).toEqual(['0:a', '1:b', '2:c']);
		});

		it('should filter out null results', () => {
			const items = ['a', 'b', 'c'];
			const mapper = (_s: string, index: number) => (index % 2 === 0 ? index : null);

			const result = mapAndFilterWithIndex(items, mapper);

			expect(result).toEqual([0, 2]);
		});

		it('should handle empty input array', () => {
			const result = mapAndFilterWithIndex([], (_s: string, _i: number) => null);

			expect(result).toEqual([]);
		});

		it('should return empty array when all results are null', () => {
			const items = [1, 2, 3];
			const mapper = (_n: number, _i: number) => null;

			const result = mapAndFilterWithIndex(items, mapper);

			expect(result).toEqual([]);
		});
	});

	describe('mapAndFilterUndefined', () => {
		it('should map items and keep non-undefined results', () => {
			const items = [1, 2, 3, 4, 5];
			const mapper = (n: number) => (n > 3 ? n * 10 : undefined);

			const result = mapAndFilterUndefined(items, mapper);

			expect(result).toEqual([40, 50]);
		});

		it('should return empty array when all results are undefined', () => {
			const items = [1, 2, 3];
			const mapper = (_n: number) => undefined;

			const result = mapAndFilterUndefined(items, mapper);

			expect(result).toEqual([]);
		});

		it('should keep null values (only filters undefined)', () => {
			const items = [1, 2, 3];
			const mapper = (n: number): number | null | undefined => {
				if (n === 1) return null;
				if (n === 2) return undefined;
				return n;
			};

			const result = mapAndFilterUndefined(items, mapper);

			expect(result).toEqual([null, 3]);
		});

		it('should handle empty input array', () => {
			const result = mapAndFilterUndefined([], (x: number) => x);

			expect(result).toEqual([]);
		});
	});
});
