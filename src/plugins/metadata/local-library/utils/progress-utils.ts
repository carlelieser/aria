import pLimit from 'p-limit';
import type { ScanProgress } from '../types';

/** Number of files to process concurrently */
export const BATCH_CONCURRENCY = 5;

/** Minimum interval between progress updates (ms) */
export const PROGRESS_THROTTLE_MS = 100;

/**
 * Process items in parallel with controlled concurrency using p-limit.
 */
export async function processBatched<T, R>(
	items: T[],
	processor: (item: T, index: number) => Promise<R>,
	concurrency: number
): Promise<R[]> {
	const limit = pLimit(concurrency);
	return Promise.all(items.map((item, index) => limit(() => processor(item, index))));
}

/**
 * Creates a throttled version of a callback that only fires at most once per interval.
 */
export function createThrottledProgress(
	callback: ((progress: ScanProgress) => void) | undefined,
	intervalMs: number
): (progress: ScanProgress) => void {
	if (!callback) {
		return () => {};
	}

	let lastCall = 0;
	let pendingProgress: ScanProgress | null = null;

	return (progress: ScanProgress) => {
		const now = Date.now();
		pendingProgress = progress;

		if (progress.phase === 'complete' || progress.phase === 'indexing') {
			callback(progress);
			lastCall = now;
			return;
		}

		if (now - lastCall >= intervalMs) {
			callback(pendingProgress);
			lastCall = now;
		}
	};
}
