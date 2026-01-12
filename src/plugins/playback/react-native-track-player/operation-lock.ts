/**
 * Operation Lock
 *
 * Provides a mutex-like mechanism to serialize asynchronous operations.
 */

export class OperationLock {
	private lock: Promise<void> = Promise.resolve();

	async withLock<T>(operation: () => Promise<T>): Promise<T> {
		const previousLock = this.lock;
		let resolve: (() => void) | undefined;

		this.lock = new Promise((r) => {
			resolve = r;
		});

		try {
			await previousLock;
			return await operation();
		} finally {
			if (resolve) {
				resolve();
			}
		}
	}
}
