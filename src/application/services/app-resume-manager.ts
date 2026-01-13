/**
 * App Resume Manager
 *
 * Coordinates app resume operations to prevent UI unresponsiveness.
 * Queues and batches operations to be executed after UI interactions complete.
 */

import { InteractionManager } from 'react-native';
import { getLogger } from '@/src/shared/services/logger';

const logger = getLogger('AppResumeManager');

/** Time threshold (ms) after which stores should refresh */
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum concurrent resume operations */
const MAX_CONCURRENT_OPERATIONS = 2;

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

	/**
	 * Records when the app goes to background
	 */
	onBackground(): void {
		this.lastBackgroundTime = Date.now();
		logger.debug('App went to background');
	}

	/**
	 * Handle app resume with deferred operations
	 */
	async onResume(): Promise<void> {
		this.lastResumeTime = Date.now();
		const backgroundDuration =
			this.lastBackgroundTime > 0 ? this.lastResumeTime - this.lastBackgroundTime : 0;

		logger.info(`App resumed after ${backgroundDuration}ms in background`);

		// Process any pending operations
		if (this.pendingOperations.length > 0) {
			await this.processOperationsDeferred();
		}
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
 */
function yieldToUI(): Promise<void> {
	return new Promise((resolve) => {
		// setImmediate or setTimeout(0) allows the UI thread to process pending work
		if (typeof setImmediate !== 'undefined') {
			setImmediate(resolve);
		} else {
			setTimeout(resolve, 0);
		}
	});
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
