/**
 * NoOpEventBus
 *
 * A no-operation implementation of PluginEventBus for contexts where
 * event handling is not needed (e.g., DI container initialization).
 */

import type { PluginEventBus } from './interfaces/base-plugin';

/**
 * No-operation event bus that silently ignores all event operations.
 * Useful for plugin initialization when event handling is not required.
 */
export class NoOpEventBus implements PluginEventBus {
	emit<T = unknown>(_event: string, _data: T): void {
		// Intentionally empty - no-op
	}

	on<T = unknown>(_event: string, _handler: (data: T) => void): () => void {
		return () => {
			// Intentionally empty - no-op unsubscribe
		};
	}

	once<T = unknown>(_event: string, _handler: (data: T) => void): () => void {
		return () => {
			// Intentionally empty - no-op unsubscribe
		};
	}

	off(_event: string, _handler: (data: unknown) => void): void {
		// Intentionally empty - no-op
	}
}

/**
 * Singleton instance of NoOpEventBus for reuse.
 */
export const noOpEventBus = new NoOpEventBus();
