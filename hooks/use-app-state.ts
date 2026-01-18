import { useEffect, useRef, useCallback } from 'react';
import { AppState, InteractionManager, type AppStateStatus } from 'react-native';
import { getLogger } from '@/src/shared/services/logger';

const logger = getLogger('AppState');

const LONG_BACKGROUND_THRESHOLD_MS = 30_000;

const DEFERRED_TIMEOUT_MS = 5_000;

const VERY_LONG_BACKGROUND_THRESHOLD_MS = 5 * 60 * 1000;

const VERY_LONG_BACKGROUND_DELAY_MS = 50;

type AppStateListener = (event: {
	previousState: AppStateStatus;
	currentState: AppStateStatus;
	wasLongBackground: boolean;
	backgroundDuration: number;
}) => void;

interface UseAppStateOptions {
	onForeground?: AppStateListener;
	onBackground?: AppStateListener;
	onChange?: AppStateListener;
	deferForegroundCallbacks?: boolean;
}

export function useAppState(options: UseAppStateOptions = {}) {
	const { onForeground, onBackground, onChange, deferForegroundCallbacks = true } = options;

	const previousStateRef = useRef<AppStateStatus>(AppState.currentState);
	const backgroundStartTimeRef = useRef<number | null>(null);

	const handleAppStateChange = useCallback(
		(nextAppState: AppStateStatus) => {
			const previousState = previousStateRef.current;

			if (previousState === nextAppState) {
				return;
			}

			let backgroundDuration = 0;

			if (
				previousState.match(/inactive|background/) &&
				nextAppState === 'active' &&
				backgroundStartTimeRef.current !== null
			) {
				backgroundDuration = Date.now() - backgroundStartTimeRef.current;
				backgroundStartTimeRef.current = null;
			}

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

			previousStateRef.current = nextAppState;

			onChange?.(event);

			if (previousState.match(/inactive|background/) && nextAppState === 'active') {
				if (deferForegroundCallbacks && onForeground) {
					const isVeryLongBackground =
						backgroundDuration > VERY_LONG_BACKGROUND_THRESHOLD_MS;

					const executeCallback = () => {
						const handle = InteractionManager.runAfterInteractions(() => {
							onForeground(event);
						});

						setTimeout(() => {
							handle.cancel();
						}, DEFERRED_TIMEOUT_MS);
					};

					if (isVeryLongBackground) {
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
