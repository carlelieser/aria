/**
 * Search Filtering Utilities
 *
 * Pure TypeScript utilities for filtering and sorting search results.
 * No React/React Native imports - domain layer only.
 */

import type { Track } from '../entities/track';
import {
	getPrimaryArtistName,
	matchesBaseFilters,
	countBaseActiveFilters,
	hasBaseActiveFilters,
	type BaseFilters,
} from './core-filtering';

export type SearchContentType = 'all' | 'tracks' | 'albums' | 'artists';
export type SearchSortField = 'relevance' | 'title' | 'artist' | 'duration';
export type SearchSortDirection = 'asc' | 'desc';

export type UnifiedSortField = 'relevance' | 'title' | 'artist' | 'dateAdded' | 'duration';

export interface SearchFilters extends BaseFilters {
	readonly contentType: SearchContentType;
}

export interface UnifiedSearchFilters extends BaseFilters {
	readonly contentType: SearchContentType;
	readonly downloadedOnly: boolean;
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
	contentType: 'all',
	favoritesOnly: false,
	artistIds: [],
	albumIds: [],
	providerIds: [],
};

export const DEFAULT_UNIFIED_FILTERS: UnifiedSearchFilters = {
	contentType: 'all',
	favoritesOnly: false,
	downloadedOnly: false,
	artistIds: [],
	albumIds: [],
	providerIds: [],
};

/**
 * Sorts search results by the specified field and direction.
 * For relevance sorting, preserves original order (search API ranking).
 */
export function sortSearchResults(
	tracks: readonly Track[],
	field: SearchSortField,
	direction: SearchSortDirection,
	originalOrder?: Map<string, number>
): Track[] {
	if (field === 'relevance') {
		if (!originalOrder) {
			return [...tracks];
		}
		const sorted = [...tracks].sort((a, b) => {
			const orderA = originalOrder.get(a.id.value) ?? Infinity;
			const orderB = originalOrder.get(b.id.value) ?? Infinity;
			return orderA - orderB;
		});
		return direction === 'desc' ? sorted : sorted.reverse();
	}

	const sorted = [...tracks].sort((a, b) => compareSearchResults(a, b, field));
	return direction === 'desc' ? sorted.reverse() : sorted;
}

function compareSearchResults(a: Track, b: Track, field: SearchSortField): number {
	switch (field) {
		case 'title':
			return a.title.localeCompare(b.title);
		case 'artist':
			return getPrimaryArtistName(a).localeCompare(getPrimaryArtistName(b));
		case 'duration':
			return a.duration.totalMilliseconds - b.duration.totalMilliseconds;
		default:
			return 0;
	}
}

/**
 * Filters search results based on active filters.
 */
export function filterSearchResults(
	tracks: readonly Track[],
	filters: SearchFilters,
	favoriteIds: Set<string>
): Track[] {
	return tracks.filter((track) => matchesSearchFilters(track, filters, favoriteIds));
}

export function matchesSearchFilters(
	track: Track,
	filters: SearchFilters,
	favoriteIds: Set<string>
): boolean {
	return matchesBaseFilters(track, filters, favoriteIds);
}

export function hasActiveSearchFilters(filters: SearchFilters): boolean {
	return filters.contentType !== 'all' || hasBaseActiveFilters(filters);
}

export function countActiveSearchFilters(filters: SearchFilters): number {
	let count = countBaseActiveFilters(filters);
	if (filters.contentType !== 'all') count += 1;
	return count;
}

export function hasActiveUnifiedFilters(filters: UnifiedSearchFilters): boolean {
	return filters.contentType !== 'all' || filters.downloadedOnly || hasBaseActiveFilters(filters);
}

export function countActiveUnifiedFilters(filters: UnifiedSearchFilters): number {
	let count = countBaseActiveFilters(filters);
	if (filters.contentType !== 'all') count += 1;
	if (filters.downloadedOnly) count += 1;
	return count;
}

/**
 * Creates an order map from the original search results to preserve relevance ranking.
 */
export function createRelevanceOrderMap(tracks: readonly Track[]): Map<string, number> {
	const orderMap = new Map<string, number>();
	tracks.forEach((track, index) => {
		orderMap.set(track.id.value, index);
	});
	return orderMap;
}
