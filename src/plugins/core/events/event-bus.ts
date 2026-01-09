import { getLogger } from '@shared/services/logger';

const logger = getLogger('EventBus');

export type EventHandler<T = unknown> = (data: T) => void;

interface EventSubscription {
	readonly event: string;

	readonly handler: EventHandler;

	readonly once: boolean;
}

export class EventBus {
	private subscriptions = new Map<string, Set<EventSubscription>>();
	private eventHistory = new Map<string, unknown[]>();
	private readonly maxHistorySize: number;

	constructor(options: { maxHistorySize?: number } = {}) {
		this.maxHistorySize = options.maxHistorySize ?? 100;
	}

	on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
		const subscription: EventSubscription = {
			event,
			handler: handler as EventHandler,
			once: false,
		};

		this.addSubscription(event, subscription);

		return () => this.off(event, handler as EventHandler);
	}

	once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
		const subscription: EventSubscription = {
			event,
			handler: handler as EventHandler,
			once: true,
		};

		this.addSubscription(event, subscription);

		return () => this.off(event, handler as EventHandler);
	}

	off(event: string, handler: EventHandler): void {
		const subscriptions = this.subscriptions.get(event);
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
			this.subscriptions.delete(event);
		}
	}

	removeAllListeners(event?: string): void {
		if (event) {
			this.subscriptions.delete(event);
		} else {
			this.subscriptions.clear();
		}
	}

	emit<T = unknown>(event: string, data: T): void {
		this.addToHistory(event, data);

		const subscriptions = this.subscriptions.get(event);
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
			this.subscriptions.delete(event);
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
		return this.subscriptions.get(event)?.size ?? 0;
	}

	eventNames(): string[] {
		return Array.from(this.subscriptions.keys());
	}

	getHistory(event: string, limit?: number): unknown[] {
		const history = this.eventHistory.get(event) ?? [];
		if (limit && limit > 0) {
			return history.slice(-limit);
		}
		return [...history];
	}

	clearHistory(event?: string): void {
		if (event) {
			this.eventHistory.delete(event);
		} else {
			this.eventHistory.clear();
		}
	}

	scope(prefix: string): ScopedEventBus {
		return new ScopedEventBus(this, prefix);
	}

	private addSubscription(event: string, subscription: EventSubscription): void {
		let subscriptions = this.subscriptions.get(event);
		if (!subscriptions) {
			subscriptions = new Set();
			this.subscriptions.set(event, subscriptions);
		}
		subscriptions.add(subscription);
	}

	private addToHistory(event: string, data: unknown): void {
		let history = this.eventHistory.get(event);
		if (!history) {
			history = [];
			this.eventHistory.set(event, history);
		}

		history.push(data);

		if (history.length > this.maxHistorySize) {
			history.shift();
		}
	}
}

export class ScopedEventBus {
	constructor(
		private readonly parent: EventBus,
		private readonly prefix: string
	) {}

	private scopedEvent(event: string): string {
		return `${this.prefix}:${event}`;
	}

	on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
		return this.parent.on(this.scopedEvent(event), handler);
	}

	once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
		return this.parent.once(this.scopedEvent(event), handler);
	}

	off(event: string, handler: EventHandler): void {
		this.parent.off(this.scopedEvent(event), handler);
	}

	removeAllListeners(event?: string): void {
		if (event) {
			this.parent.removeAllListeners(this.scopedEvent(event));
		} else {
			for (const eventName of this.parent.eventNames()) {
				if (eventName.startsWith(`${this.prefix}:`)) {
					this.parent.removeAllListeners(eventName);
				}
			}
		}
	}

	emit<T = unknown>(event: string, data: T): void {
		this.parent.emit(this.scopedEvent(event), data);
	}

	async emitAsync<T = unknown>(event: string, data: T): Promise<void> {
		return this.parent.emitAsync(this.scopedEvent(event), data);
	}

	waitFor<T = unknown>(event: string, timeout?: number): Promise<T> {
		return this.parent.waitFor(this.scopedEvent(event), timeout);
	}

	listenerCount(event: string): number {
		return this.parent.listenerCount(this.scopedEvent(event));
	}

	eventNames(): string[] {
		const prefix = `${this.prefix}:`;
		return this.parent
			.eventNames()
			.filter((name) => name.startsWith(prefix))
			.map((name) => name.substring(prefix.length));
	}

	getHistory(event: string, limit?: number): unknown[] {
		return this.parent.getHistory(this.scopedEvent(event), limit);
	}

	clearHistory(event?: string): void {
		if (event) {
			this.parent.clearHistory(this.scopedEvent(event));
		} else {
			for (const eventName of this.parent.eventNames()) {
				if (eventName.startsWith(`${this.prefix}:`)) {
					this.parent.clearHistory(eventName);
				}
			}
		}
	}
}

export function createEventBus(options?: { maxHistorySize?: number }): EventBus {
	return new EventBus(options);
}
