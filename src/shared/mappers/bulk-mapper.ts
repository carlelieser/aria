/**
 * Bulk Mapper Utilities
 *
 * Utilities for mapping arrays with automatic null filtering.
 */

/**
 * Maps an array of items and filters out null results.
 * Useful for converting external API responses where some items may be invalid.
 */
export function mapAndFilter<TInput, TOutput>(
	items: readonly TInput[],
	mapper: (item: TInput) => TOutput | null
): TOutput[] {
	return items.map(mapper).filter((item): item is TOutput => item !== null);
}

/**
 * Maps an array of items with index and filters out null results.
 */
export function mapAndFilterWithIndex<TInput, TOutput>(
	items: readonly TInput[],
	mapper: (item: TInput, index: number) => TOutput | null
): TOutput[] {
	return items
		.map((item, index) => mapper(item, index))
		.filter((item): item is TOutput => item !== null);
}

/**
 * Maps an array of items and filters out undefined results.
 */
export function mapAndFilterUndefined<TInput, TOutput>(
	items: readonly TInput[],
	mapper: (item: TInput) => TOutput | undefined
): TOutput[] {
	return items.map(mapper).filter((item): item is TOutput => item !== undefined);
}
