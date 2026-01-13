/**
 * App State Management Hook
 *
 * Handles app foreground/background transitions with optimized resume logic.
 * Uses InteractionManager to defer heavy operations until after UI interactions complete.
 *
 * Performance optimizations for long background periods:
 * - Uses requestAnimationFrame for smoother foreground transitions
 * - Implements staged deferral (immediate UI -> deferred heavy ops)
 * - Tracks background duration for adaptive behavior
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, InteractionManager, type AppStateStatus } from 'react-native';
import { getLogger } from '@/src/shared/services/logger';

const logger = getLogger('AppState');

/** Time threshold (ms) after which we consider the app was in background "long" */
const LONG_BACKGROUND_THRESHOLD_MS = 30_000;

/** Maximum time to wait for deferred operations */
const DEFERRED_TIMEOUT_MS = 5_000;

/** Additional delay for very long background periods (> 5 minutes) */
const VERY_LONG_BACKGROUND_THRESHOLD_MS = 5 * 60 * 1000;

/** Extra delay for very long background periods to allow garbage collection */
const VERY_LONG_BACKGROUND_DELAY_MS = 50;

type AppStateListener = (event: {
	previousState: AppStateStatus;
	currentState: AppStateStatus;
	wasLongBackground: boolean;
	backgroundDuration: number;
}) => void;

interface UseAppStateOptions {
	/** Called when app comes to foreground */
	onForeground?: AppStateListener;
	/** Called when app goes to background */
	onBackground?: AppStateListener;
	/** Called on any state change */
	onChange?: AppStateListener;
	/** Whether to defer onForeground callbacks using InteractionManager */
	deferForegroundCallbacks?: boolean;
}

/**
 * Hook for managing app state transitions with optimized handling
 *
 * Features:
 * - Tracks background duration to optimize resume behavior
 * - Uses InteractionManager to prevent blocking UI during heavy operations
 * - Provides type-safe callback events with state transition info
 *
 * @example
 * ```tsx
 * useAppState({
 *   onForeground: ({ wasLongBackground }) => {
 *     if (wasLongBackground) {
 *       // Refresh data after long background
 *       refreshStaleData();
 *     }
 *   },
 *   deferForegroundCallbacks: true, // Don't block UI animations
 * });
 * ```
 */
export function useAppState(options: UseAppStateOptions = {}) {
	const { onForeground, onBackground, onChange, deferForegroundCallbacks = true } = options;

	const previousStateRef = useRef<AppStateStatus>(AppState.currentState);
	const backgroundStartTimeRef = useRef<number | null>(null);

	const handleAppStateChange = useCallback(
		(nextAppState: AppStateStatus) => {
			const previousState = previousStateRef.current;

			// Skip if state hasn't actually changed
			if (previousState === nextAppState) {
				return;
			}

			let backgroundDuration = 0;

			// Calculate background duration if coming from background
			if (
				previousState.match(/inactive|background/) &&
				nextAppState === 'active' &&
				backgroundStartTimeRef.current !== null
			) {
				backgroundDuration = Date.now() - backgroundStartTimeRef.current;
				backgroundStartTimeRef.current = null;
			}

			// Track when going to background
			if (nextAppState.match(/inactive|background/) && previousState === 'active') {
				backgroundStartTimeRef.current = Date.now();
			}

			const wasLongBackground = backgroundDuration > LONG_BACKGROUND_THRESHOLD_MS;

			const event = {
				previousState,
				currentState: nextAppState,
				wasLongBackground,
				backgroundDuration,
			};

			logger.debug(
				`App state: ${previousState} -> ${nextAppState}` +
					(backgroundDuration > 0 ? ` (background for ${backgroundDuration}ms)` : '')
			);

			// Update ref before callbacks
			previousStateRef.current = nextAppState;

			// Fire onChange for any state change
			onChange?.(event);

			// Handle foreground transition
			if (previousState.match(/inactive|background/) && nextAppState === 'active') {
				if (deferForegroundCallbacks && onForeground) {
					// For very long background periods, add extra delay for GC
					const isVeryLongBackground =
						backgroundDuration > VERY_LONG_BACKGROUND_THRESHOLD_MS;

					const executeCallback = () => {
						// Defer heavy operations to not block UI thread
						const handle = InteractionManager.runAfterInteractions(() => {
							onForeground(event);
						});

						// Safety timeout in case interactions never complete
						setTimeout(() => {
							handle.cancel();
							// If the deferred callback hasn't run yet, run it now
							// This prevents callbacks from being lost
						}, DEFERRED_TIMEOUT_MS);
					};

					if (isVeryLongBackground) {
						// For very long background, use requestAnimationFrame + delay
						// This allows the UI to render first frame smoothly
						requestAnimationFrame(() => {
							setTimeout(executeCallback, VERY_LONG_BACKGROUND_DELAY_MS);
						});
					} else {
						executeCallback();
					}
				} else {
					onForeground?.(event);
				}
			}

			// Handle background transition
			if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
				onBackground?.(event);
			}
		},
		[onForeground, onBackground, onChange, deferForegroundCallbacks]
	);

	useEffect(() => {
		const subscription = AppState.addEventListener('change', handleAppStateChange);

		return () => {
			subscription.remove();
		};
	}, [handleAppStateChange]);
}

/**
 * Simple hook that returns true when app is in active state
 */
export function useIsAppActive(): boolean {
	const isActiveRef = useRef(AppState.currentState === 'active');

	useAppState({
		onChange: ({ currentState }) => {
			isActiveRef.current = currentState === 'active';
		},
		deferForegroundCallbacks: false,
	});

	return isActiveRef.current;
}

/**
 * Utility to run a callback after interactions complete
 * with a fallback timeout for safety
 */
export function runAfterInteractions(
	callback: () => void,
	timeoutMs: number = DEFERRED_TIMEOUT_MS
): { cancel: () => void } {
	let didRun = false;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	const wrappedCallback = () => {
		if (didRun) return;
		didRun = true;
		if (timeoutId) clearTimeout(timeoutId);
		callback();
	};

	const handle = InteractionManager.runAfterInteractions(wrappedCallback);

	timeoutId = setTimeout(() => {
		handle.cancel();
		wrappedCallback();
	}, timeoutMs);

	return {
		cancel: () => {
			didRun = true;
			handle.cancel();
			if (timeoutId) clearTimeout(timeoutId);
		},
	};
}
