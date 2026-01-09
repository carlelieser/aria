import { getLogger } from '@shared/services/logger';

const logger = getLogger('EventBus');

/**
 * Type-safe event handler
 */
export type EventHandler<T = unknown> = (data: T) => void;

/**
 * Event subscription
 */
interface EventSubscription {
  /** Event name */
  readonly event: string;
  /** Event handler */
  readonly handler: EventHandler;
  /** Whether this is a one-time subscription */
  readonly once: boolean;
}

/**
 * Event bus for plugin communication
 * Provides type-safe event emission and subscription
 */
export class EventBus {
  private subscriptions = new Map<string, Set<EventSubscription>>();
  private eventHistory = new Map<string, unknown[]>();
  private readonly maxHistorySize: number;

  constructor(options: { maxHistorySize?: number } = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 100;
  }

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param handler - Event handler callback
   * @returns Unsubscribe function
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const subscription: EventSubscription = {
      event,
      handler: handler as EventHandler,
      once: false,
    };

    this.addSubscription(event, subscription);

    // Return unsubscribe function
    return () => this.off(event, handler as EventHandler);
  }

  /**
   * Subscribe to an event once
   * Handler will be automatically removed after first invocation
   * @param event - Event name
   * @param handler - Event handler callback
   * @returns Unsubscribe function
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const subscription: EventSubscription = {
      event,
      handler: handler as EventHandler,
      once: true,
    };

    this.addSubscription(event, subscription);

    // Return unsubscribe function
    return () => this.off(event, handler as EventHandler);
  }

  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param handler - Event handler to remove
   */
  off(event: string, handler: EventHandler): void {
    const subscriptions = this.subscriptions.get(event);
    if (!subscriptions) return;

    // Remove all subscriptions with matching handler
    const toRemove: EventSubscription[] = [];
    subscriptions.forEach(subscription => {
      if (subscription.handler === handler) {
        toRemove.push(subscription);
      }
    });

    toRemove.forEach(subscription => {
      subscriptions.delete(subscription);
    });

    // Clean up if no more subscriptions
    if (subscriptions.size === 0) {
      this.subscriptions.delete(event);
    }
  }

  /**
   * Remove all subscriptions for an event
   * @param event - Event name (if omitted, removes all subscriptions)
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.subscriptions.delete(event);
    } else {
      this.subscriptions.clear();
    }
  }

  /**
   * Emit an event with data
   * @param event - Event name
   * @param data - Event data
   */
  emit<T = unknown>(event: string, data: T): void {
    // Store in history
    this.addToHistory(event, data);

    const subscriptions = this.subscriptions.get(event);
    if (!subscriptions || subscriptions.size === 0) return;

    // Create a copy to avoid issues if handlers modify subscriptions
    const subscriptionsCopy = Array.from(subscriptions);

    // Call each handler
    for (const subscription of subscriptionsCopy) {
      try {
        subscription.handler(data);
      } catch (error) {
        // Log error but don't stop other handlers
        logger.error(`Error in event handler for "${event}"`, error instanceof Error ? error : undefined);
      }

      // Remove one-time subscriptions
      if (subscription.once) {
        subscriptions.delete(subscription);
      }
    }

    // Clean up if no more subscriptions
    if (subscriptions.size === 0) {
      this.subscriptions.delete(event);
    }
  }

  /**
   * Emit an event asynchronously
   * Handlers are called in the next tick
   * @param event - Event name
   * @param data - Event data
   */
  async emitAsync<T = unknown>(event: string, data: T): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.emit(event, data);
        resolve();
      }, 0);
    });
  }

  /**
   * Wait for an event to be emitted
   * Returns a promise that resolves with the event data
   * @param event - Event name
   * @param timeout - Optional timeout in milliseconds
   */
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

  /**
   * Get the number of listeners for an event
   * @param event - Event name
   */
  listenerCount(event: string): number {
    return this.subscriptions.get(event)?.size ?? 0;
  }

  /**
   * Get all event names with active subscriptions
   */
  eventNames(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get event history for an event
   * @param event - Event name
   * @param limit - Maximum number of history items to return
   */
  getHistory(event: string, limit?: number): unknown[] {
    const history = this.eventHistory.get(event) ?? [];
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    return [...history];
  }

  /**
   * Clear event history
   * @param event - Event name (if omitted, clears all history)
   */
  clearHistory(event?: string): void {
    if (event) {
      this.eventHistory.delete(event);
    } else {
      this.eventHistory.clear();
    }
  }

  /**
   * Create a scoped event bus
   * All events emitted from this scope will be prefixed
   * @param prefix - Event name prefix
   */
  scope(prefix: string): ScopedEventBus {
    return new ScopedEventBus(this, prefix);
  }

  /**
   * Add a subscription
   */
  private addSubscription(event: string, subscription: EventSubscription): void {
    let subscriptions = this.subscriptions.get(event);
    if (!subscriptions) {
      subscriptions = new Set();
      this.subscriptions.set(event, subscriptions);
    }
    subscriptions.add(subscription);
  }

  /**
   * Add event data to history
   */
  private addToHistory(event: string, data: unknown): void {
    let history = this.eventHistory.get(event);
    if (!history) {
      history = [];
      this.eventHistory.set(event, history);
    }

    history.push(data);

    // Trim history if it exceeds max size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }
}

/**
 * Scoped event bus
 * Automatically prefixes all event names with a scope
 */
export class ScopedEventBus {
  constructor(
    private readonly parent: EventBus,
    private readonly prefix: string
  ) {}

  /**
   * Get the scoped event name
   */
  private scopedEvent(event: string): string {
    return `${this.prefix}:${event}`;
  }

  /**
   * Subscribe to a scoped event
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    return this.parent.on(this.scopedEvent(event), handler);
  }

  /**
   * Subscribe to a scoped event once
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    return this.parent.once(this.scopedEvent(event), handler);
  }

  /**
   * Unsubscribe from a scoped event
   */
  off(event: string, handler: EventHandler): void {
    this.parent.off(this.scopedEvent(event), handler);
  }

  /**
   * Remove all listeners for a scoped event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.parent.removeAllListeners(this.scopedEvent(event));
    } else {
      // Remove all events with this prefix
      for (const eventName of this.parent.eventNames()) {
        if (eventName.startsWith(`${this.prefix}:`)) {
          this.parent.removeAllListeners(eventName);
        }
      }
    }
  }

  /**
   * Emit a scoped event
   */
  emit<T = unknown>(event: string, data: T): void {
    this.parent.emit(this.scopedEvent(event), data);
  }

  /**
   * Emit a scoped event asynchronously
   */
  async emitAsync<T = unknown>(event: string, data: T): Promise<void> {
    return this.parent.emitAsync(this.scopedEvent(event), data);
  }

  /**
   * Wait for a scoped event
   */
  waitFor<T = unknown>(event: string, timeout?: number): Promise<T> {
    return this.parent.waitFor(this.scopedEvent(event), timeout);
  }

  /**
   * Get listener count for a scoped event
   */
  listenerCount(event: string): number {
    return this.parent.listenerCount(this.scopedEvent(event));
  }

  /**
   * Get scoped event names
   */
  eventNames(): string[] {
    const prefix = `${this.prefix}:`;
    return this.parent
      .eventNames()
      .filter(name => name.startsWith(prefix))
      .map(name => name.substring(prefix.length));
  }

  /**
   * Get event history for a scoped event
   */
  getHistory(event: string, limit?: number): unknown[] {
    return this.parent.getHistory(this.scopedEvent(event), limit);
  }

  /**
   * Clear history for a scoped event
   */
  clearHistory(event?: string): void {
    if (event) {
      this.parent.clearHistory(this.scopedEvent(event));
    } else {
      // Clear all history with this prefix
      for (const eventName of this.parent.eventNames()) {
        if (eventName.startsWith(`${this.prefix}:`)) {
          this.parent.clearHistory(eventName);
        }
      }
    }
  }
}

/**
 * Create a global event bus instance
 */
export function createEventBus(options?: { maxHistorySize?: number }): EventBus {
  return new EventBus(options);
}
