/**
 * useDeferredMount Hook
 *
 * Defers heavy content rendering until after pending interactions complete.
 * Returns false on the initial mount, then flips to true after
 * InteractionManager.runAfterInteractions resolves.
 *
 * Resets to false whenever the provided `isActive` flag toggles off, so
 * re-opening a sheet/modal re-triggers the deferral.
 */

import { useState, useEffect } from 'react';
import { InteractionManager } from 'react-native';

export function useDeferredMount(isActive: boolean): boolean {
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		if (!isActive) {
			setIsReady(false);
			return;
		}

		const handle = InteractionManager.runAfterInteractions(() => {
			setIsReady(true);
		});

		return () => handle.cancel();
	}, [isActive]);

	return isReady;
}
