import type { PluginInitContext, PluginStatus } from '@plugins/core/interfaces/base-plugin';
import { ok, err, type AsyncResult } from '@shared/types/result';
import { waitForLocalLibraryHydration } from '../storage/local-library-store';
import { initializeDatabase, closeDatabase } from '../storage/database';

export interface PluginLifecycle {
	status: PluginStatus;
	onInit: (context: PluginInitContext) => AsyncResult<void, Error>;
	onActivate: () => AsyncResult<void, Error>;
	onDeactivate: () => AsyncResult<void, Error>;
	onDestroy: () => AsyncResult<void, Error>;
}

/**
 * Create plugin lifecycle handlers.
 */
export function createLifecycleHandlers(): PluginLifecycle {
	let status: PluginStatus = 'uninitialized';

	return {
		get status() {
			return status;
		},
		set status(value: PluginStatus) {
			status = value;
		},

		async onInit(_context: PluginInitContext): AsyncResult<void, Error> {
			try {
				status = 'initializing';
				await waitForLocalLibraryHydration();

				const dbResult = await initializeDatabase();
				if (!dbResult.success) {
					throw dbResult.error;
				}

				status = 'ready';
				return ok(undefined);
			} catch (error) {
				status = 'error';
				return err(
					error instanceof Error ? error : new Error(`Failed to initialize: ${String(error)}`)
				);
			}
		},

		async onActivate(): AsyncResult<void, Error> {
			status = 'active';
			return ok(undefined);
		},

		async onDeactivate(): AsyncResult<void, Error> {
			status = 'ready';
			return ok(undefined);
		},

		async onDestroy(): AsyncResult<void, Error> {
			await closeDatabase();
			status = 'uninitialized';
			return ok(undefined);
		},
	};
}
