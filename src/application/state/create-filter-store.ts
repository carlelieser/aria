/**
 * Filter Store Utilities
 *
 * Shared utilities for filter stores to reduce code duplication.
 */

/**
 * Base filter structure that all filter stores share.
 */
export interface BaseFilterState {
	readonly artistIds: string[];
	readonly albumIds: string[];
	readonly favoritesOnly: boolean;
}

/**
 * Toggles an ID in an array (adds if not present, removes if present).
 */
export function toggleIdInArray(ids: string[], id: string): string[] {
	return ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
}
