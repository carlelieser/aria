/**
 * useDeferredComputation Hook
 *
 * A generic hook for deferring expensive computations using InteractionManager.
 * Includes debouncing, caching, and threshold-based deferral.
 *
 * This hook is designed for scenarios where:
 * - Computation is expensive (large data sets)
 * - UI responsiveness is critical during interactions
 * - Results can be slightly stale during heavy operations
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { appResumeManager } from '@/src/application/services/app-resume-manager';

const DEFAULT_THRESHOLD = 200;
const RESUME_THRESHOLD = 100;
const DEBOUNCE_MS = 16;

interface CacheEntry<T> {
	result: T;
	dependencies: unknown[];
}

interface UseDeferredComputationOptions {
	/** Threshold for total item count before deferring computation */
	threshold?: number;
	/** Threshold to use after app was in background for a long time */
	resumeThreshold?: number;
	/** Debounce delay in milliseconds */
	debounceMs?: number;
}

/**
 * Creates a deferred computation hook with its own cache.
 * Use this factory to create separate hooks for different data types.
 *
 * @example
 * ```ts
 * const useDeferredTracks = createDeferredComputation<Track[]>([]);
 *
 * // In component:
 * const tracks = useDeferredTracks(
 *   () => computeAggregatedTracks(libraryTracks, localTracks),
 *   [libraryTracks, localTracks],
 *   libraryTracks.length + Object.keys(localTracks).length
 * );
 * ```
 */
export function createDeferredComputation<T>(initialValue: T) {
	let cache: CacheEntry<T> = {
		result: initialValue,
		dependencies: [],
	};

	function haveDependenciesChanged(newDeps: unknown[]): boolean {
		if (cache.dependencies.length !== newDeps.length) return true;
		return newDeps.some((dep, i) => dep !== cache.dependencies[i]);
	}

	return function useDeferredComputation(
		computeFn: () => T,
		dependencies: unknown[],
		totalCount: number,
		options: UseDeferredComputationOptions = {}
	): T {
		const {
			threshold = DEFAULT_THRESHOLD,
			resumeThreshold = RESUME_THRESHOLD,
			debounceMs = DEBOUNCE_MS,
		} = options;

		const [deferredResult, setDeferredResult] = useState<T | null>(null);
		const isComputingRef = useRef(false);
		const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

		const hasChanged = haveDependenciesChanged(dependencies);

		const activeThreshold = appResumeManager.wasLongBackground() ? resumeThreshold : threshold;
		const shouldDefer = hasChanged && totalCount > activeThreshold;

		useEffect(() => {
			if (!shouldDefer || isComputingRef.current) return;

			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			debounceTimerRef.current = setTimeout(() => {
				isComputingRef.current = true;

				const handle = InteractionManager.runAfterInteractions(() => {
					const result = computeFn();

					cache = {
						result,
						dependencies: [...dependencies],
					};

					setDeferredResult(result);
					isComputingRef.current = false;
				});

				debounceTimerRef.current = null;

				return () => {
					handle.cancel();
					isComputingRef.current = false;
				};
			}, debounceMs);

			return () => {
				if (debounceTimerRef.current) {
					clearTimeout(debounceTimerRef.current);
					debounceTimerRef.current = null;
				}
				isComputingRef.current = false;
			};
			// Dynamic dependencies array - spread is intentional
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [shouldDefer, computeFn, debounceMs, ...dependencies]);

		return useMemo(() => {
			if (!hasChanged) {
				return cache.result;
			}

			if (shouldDefer) {
				return deferredResult ?? cache.result;
			}

			const result = computeFn();

			cache = {
				result,
				dependencies: [...dependencies],
			};

			return result;
			// Dynamic dependencies array - spread is intentional
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [...dependencies, hasChanged, shouldDefer, deferredResult, computeFn]);
	};
}
