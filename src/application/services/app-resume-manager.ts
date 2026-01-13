/**
 * App Resume Manager
 *
 * Coordinates app resume operations to prevent UI unresponsiveness.
 * Queues and batches operations to be executed after UI interactions complete.
 *
 * Key optimizations for long background periods:
 * - Defers heavy operations using InteractionManager
 * - Batches store rehydration callbacks
 * - Uses requestAnimationFrame for critical UI paths
 * - Implements priority-based operation scheduling
 */

import { InteractionManager } from 'react-native';
import { getLogger } from '@/src/shared/services/logger';

const logger = getLogger('AppResumeManager');

/** Time threshold (ms) after which stores should refresh */
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** Long background threshold - triggers more aggressive deferral */
const LONG_BACKGROUND_THRESHOLD_MS = 30_000; // 30 seconds

/** Maximum concurrent resume operations */
const MAX_CONCURRENT_OPERATIONS = 2;

/** Delay before processing queued operations to allow UI to stabilize */
const UI_STABILIZATION_DELAY_MS = 100;

type ResumeOperation = {
	id: string;
	priority: number;
	operation: () => Promise<void> | void;
};

class AppResumeManager {
	private pendingOperations: ResumeOperation[] = [];
	private isProcessing = false;
	private lastResumeTime = 0;
	private lastBackgroundTime = 0;
	private resumeCallbacks: Set<() => void> = new Set();
	private isLongBackground = false;

	/**
	 * Records when the app goes to background
	 */
	onBackground(): void {
		this.lastBackgroundTime = Date.now();
		this.isLongBackground = false;
		logger.debug('App went to background');
	}

	/**
	 * Handle app resume with deferred operations
	 */
	async onResume(): Promise<void> {
		this.lastResumeTime = Date.now();
		const backgroundDuration =
			this.lastBackgroundTime > 0 ? this.lastResumeTime - this.lastBackgroundTime : 0;

		this.isLongBackground = backgroundDuration > LONG_BACKGROUND_THRESHOLD_MS;

		logger.info(
			`App resumed after ${backgroundDuration}ms in background (long: ${this.isLongBackground})`
		);

		// For long background periods, add a stabilization delay before processing
		if (this.isLongBackground && this.pendingOperations.length > 0) {
			await this.waitForUIStabilization();
		}

		// Process any pending operations
		if (this.pendingOperations.length > 0) {
			await this.processOperationsDeferred();
		}

		// Notify all resume callbacks
		this.notifyResumeCallbacks();
	}

	/**
	 * Wait for UI to stabilize before heavy operations
	 */
	private waitForUIStabilization(): Promise<void> {
		return new Promise((resolve) => {
			// Use requestAnimationFrame to wait for next frame, then setTimeout
			requestAnimationFrame(() => {
				setTimeout(resolve, UI_STABILIZATION_DELAY_MS);
			});
		});
	}

	/**
	 * Register a callback to be notified on app resume
	 * Useful for components that need to refresh after long background
	 */
	onResumeCallback(callback: () => void): () => void {
		this.resumeCallbacks.add(callback);
		return () => {
			this.resumeCallbacks.delete(callback);
		};
	}

	/**
	 * Notify all registered resume callbacks
	 */
	private notifyResumeCallbacks(): void {
		if (this.resumeCallbacks.size === 0) return;

		// Defer callback execution to not block UI
		InteractionManager.runAfterInteractions(() => {
			for (const callback of this.resumeCallbacks) {
				try {
					callback();
				} catch (error) {
					logger.error(
						'Resume callback error:',
						error instanceof Error ? error : undefined
					);
				}
			}
		});
	}

	/**
	 * Check if the app resumed from a long background period
	 */
	wasLongBackground(): boolean {
		return this.isLongBackground;
	}

	/**
	 * Queue an operation to run on resume
	 * Operations are sorted by priority (higher = run first)
	 */
	queueOperation(id: string, operation: () => Promise<void> | void, priority = 0): void {
		// Remove existing operation with same id
		this.pendingOperations = this.pendingOperations.filter((op) => op.id !== id);

		this.pendingOperations.push({ id, priority, operation });

		// Sort by priority (descending)
		this.pendingOperations.sort((a, b) => b.priority - a.priority);

		logger.debug(`Queued resume operation: ${id} (priority: ${priority})`);
	}

	/**
	 * Remove a queued operation
	 */
	removeOperation(id: string): void {
		this.pendingOperations = this.pendingOperations.filter((op) => op.id !== id);
	}

	/**
	 * Check if stores are stale and need refresh
	 */
	isStale(): boolean {
		if (this.lastBackgroundTime === 0) return false;
		return Date.now() - this.lastBackgroundTime > STALE_THRESHOLD_MS;
	}

	/**
	 * Get time spent in background (ms)
	 */
	getBackgroundDuration(): number {
		if (this.lastBackgroundTime === 0) return 0;
		return this.lastResumeTime - this.lastBackgroundTime;
	}

	/**
	 * Process queued operations after interactions complete
	 */
	private async processOperationsDeferred(): Promise<void> {
		if (this.isProcessing) return;
		this.isProcessing = true;

		return new Promise<void>((resolve) => {
			InteractionManager.runAfterInteractions(async () => {
				try {
					await this.processOperations();
				} catch (error) {
					logger.error(
						'Error processing resume operations:',
						error instanceof Error ? error : undefined
					);
				} finally {
					this.isProcessing = false;
					resolve();
				}
			});
		});
	}

	/**
	 * Process operations in batches to avoid overwhelming the JS thread
	 */
	private async processOperations(): Promise<void> {
		const operations = [...this.pendingOperations];
		this.pendingOperations = [];

		logger.info(`Processing ${operations.length} resume operations`);

		// Process in batches
		for (let i = 0; i < operations.length; i += MAX_CONCURRENT_OPERATIONS) {
			const batch = operations.slice(i, i + MAX_CONCURRENT_OPERATIONS);

			await Promise.all(
				batch.map(async ({ id, operation }) => {
					try {
						logger.debug(`Running resume operation: ${id}`);
						await operation();
						logger.debug(`Completed resume operation: ${id}`);
					} catch (error) {
						logger.error(
							`Failed resume operation ${id}:`,
							error instanceof Error ? error : undefined
						);
					}
				})
			);

			// Yield to allow UI updates between batches
			await yieldToUI();
		}
	}
}

/**
 * Yield control back to the UI thread briefly
 * This prevents long-running JS from blocking animations
 *
 * @param useRAF - If true, uses requestAnimationFrame for smoother yielding
 */
function yieldToUI(useRAF = false): Promise<void> {
	return new Promise((resolve) => {
		if (useRAF && typeof requestAnimationFrame !== 'undefined') {
			// Use rAF for smoother yielding during animations
			requestAnimationFrame(() => resolve());
		} else if (typeof setImmediate !== 'undefined') {
			// setImmediate allows the UI thread to process pending work
			setImmediate(resolve);
		} else {
			setTimeout(resolve, 0);
		}
	});
}

/**
 * Yield using requestAnimationFrame - better for animation-sensitive operations
 */
export function yieldToAnimationFrame(): Promise<void> {
	return yieldToUI(true);
}

/**
 * Run a heavy computation in chunks to avoid blocking the UI
 *
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param chunkSize - Number of items to process per chunk
 * @param yieldInterval - How often to yield (in chunks)
 */
export async function processInChunks<T, R>(
	items: T[],
	processor: (item: T, index: number) => R,
	chunkSize = 50,
	yieldInterval = 2
): Promise<R[]> {
	const results: R[] = [];

	for (let i = 0; i < items.length; i += chunkSize) {
		const chunk = items.slice(i, i + chunkSize);

		for (let j = 0; j < chunk.length; j++) {
			results.push(processor(chunk[j], i + j));
		}

		// Yield to UI every N chunks
		if ((i / chunkSize) % yieldInterval === 0 && i > 0) {
			await yieldToUI();
		}
	}

	return results;
}

// Export singleton instance
export const appResumeManager = new AppResumeManager();
