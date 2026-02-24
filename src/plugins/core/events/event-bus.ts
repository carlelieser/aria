import { getLogger } from '@shared/services/logger';

const logger = getLogger('EventBus');

export type EventHandler<T = unknown> = (data: T) => void;

interface EventSubscription {
	readonly event: string;

	readonly handler: EventHandler;

	readonly once: boolean;
}

export class EventBus {
	private _subscriptions = new Map<string, Set<EventSubscription>>();
	private _eventHistory = new Map<string, unknown[]>();
	private readonly _maxHistorySize: number;

	constructor(options: { maxHistorySize?: number } = {}) {
		this._maxHistorySize = options.maxHistorySize ?? 100;
	}

	on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
		const subscription: EventSubscription = {
			event,
			handler: handler as EventHandler,
			once: false,
		};

		this._addSubscription(event, subscription);

		return () => this.off(event, handler as EventHandler);
	}

	once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
		const subscription: EventSubscription = {
			event,
			handler: handler as EventHandler,
			once: true,
		};

		this._addSubscription(event, subscription);

		return () => this.off(event, handler as EventHandler);
	}

	off(event: string, handler: EventHandler): void {
		const subscriptions = this._subscriptions.get(event);
		if (!subscriptions) return;

		const toRemove: EventSubscription[] = [];
		subscriptions.forEach((subscription) => {
			if (subscription.handler === handler) {
				toRemove.push(subscription);
			}
		});

		toRemove.forEach((subscription) => {
			subscriptions.delete(subscription);
		});

		if (subscriptions.size === 0) {
			this._subscriptions.delete(event);
		}
	}

	removeAllListeners(event?: string): void {
		if (event) {
			this._subscriptions.delete(event);
		} else {
			this._subscriptions.clear();
		}
	}

	emit<T = unknown>(event: string, data: T): void {
		this._addToHistory(event, data);

		const subscriptions = this._subscriptions.get(event);
		if (!subscriptions || subscriptions.size === 0) return;

		const subscriptionsCopy = Array.from(subscriptions);

		for (const subscription of subscriptionsCopy) {
			try {
				subscription.handler(data);
			} catch (error) {
				logger.error(
					`Error in event handler for "${event}"`,
					error instanceof Error ? error : undefined
				);
			}

			if (subscription.once) {
				subscriptions.delete(subscription);
			}
		}

		if (subscriptions.size === 0) {
			this._subscriptions.delete(event);
		}
	}

	async emitAsync<T = unknown>(event: string, data: T): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(() => {
				this.emit(event, data);
				resolve();
			}, 0);
		});
	}

	waitFor<T = unknown>(event: string, timeout?: number): Promise<T> {
		return new Promise((resolve, reject) => {
			let timeoutId: ReturnType<typeof setTimeout> | undefined;

			const unsubscribe = this.once<T>(event, (data) => {
				if (timeoutId) clearTimeout(timeoutId);
				resolve(data);
			});

			if (timeout) {
				timeoutId = setTimeout(() => {
					unsubscribe();
					reject(new Error(`Timeout waiting for event "${event}"`));
				}, timeout);
			}
		});
	}

	listenerCount(event: string): number {
		return this._subscriptions.get(event)?.size ?? 0;
	}

	eventNames(): string[] {
		return Array.from(this._subscriptions.keys());
	}

	getHistory(event: string, limit?: number): unknown[] {
		const history = this._eventHistory.get(event) ?? [];
		if (limit && limit > 0) {
			return history.slice(-limit);
		}
		return [...history];
	}

	clearHistory(event?: string): void {
		if (event) {
			this._eventHistory.delete(event);
		} else {
			this._eventHistory.clear();
		}
	}

	scope(prefix: string): ScopedEventBus {
		return new ScopedEventBus(this, prefix);
	}

	private _addSubscription(event: string, subscription: EventSubscription): void {
		let subscriptions = this._subscriptions.get(event);
		if (!subscriptions) {
			subscriptions = new Set();
			this._subscriptions.set(event, subscriptions);
		}
		subscriptions.add(subscription);
	}

	private _addToHistory(event: string, data: unknown): void {
		const existing = this._eventHistory.get(event) ?? [];
		const updated = [...existing, data];

		this._eventHistory.set(
			event,
			updated.length > this._maxHistorySize ? updated.slice(-this._maxHistorySize) : updated
		);
	}
}

export class ScopedEventBus {
	constructor(
		private readonly _parent: EventBus,
		private readonly _prefix: string
	) {}

	private _scopedEvent(event: string): string {
		return `${this._prefix}:${event}`;
	}

	on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
		return this._parent.on(this._scopedEvent(event), handler);
	}

	once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
		return this._parent.once(this._scopedEvent(event), handler);
	}

	off(event: string, handler: EventHandler): void {
		this._parent.off(this._scopedEvent(event), handler);
	}

	removeAllListeners(event?: string): void {
		if (event) {
			this._parent.removeAllListeners(this._scopedEvent(event));
		} else {
			for (const eventName of this._parent.eventNames()) {
				if (eventName.startsWith(`${this._prefix}:`)) {
					this._parent.removeAllListeners(eventName);
				}
			}
		}
	}

	emit<T = unknown>(event: string, data: T): void {
		this._parent.emit(this._scopedEvent(event), data);
	}

	async emitAsync<T = unknown>(event: string, data: T): Promise<void> {
		return this._parent.emitAsync(this._scopedEvent(event), data);
	}

	waitFor<T = unknown>(event: string, timeout?: number): Promise<T> {
		return this._parent.waitFor(this._scopedEvent(event), timeout);
	}

	listenerCount(event: string): number {
		return this._parent.listenerCount(this._scopedEvent(event));
	}

	eventNames(): string[] {
		const prefix = `${this._prefix}:`;
		return this._parent
			.eventNames()
			.filter((name) => name.startsWith(prefix))
			.map((name) => name.substring(prefix.length));
	}

	getHistory(event: string, limit?: number): unknown[] {
		return this._parent.getHistory(this._scopedEvent(event), limit);
	}

	clearHistory(event?: string): void {
		if (event) {
			this._parent.clearHistory(this._scopedEvent(event));
		} else {
			for (const eventName of this._parent.eventNames()) {
				if (eventName.startsWith(`${this._prefix}:`)) {
					this._parent.clearHistory(eventName);
				}
			}
		}
	}
}

export function createEventBus(options?: { maxHistorySize?: number }): EventBus {
	return new EventBus(options);
}
