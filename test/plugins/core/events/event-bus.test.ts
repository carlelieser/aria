import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus, ScopedEventBus, createEventBus } from '@plugins/core/events/event-bus';

describe('EventBus', () => {
	let eventBus: EventBus;

	beforeEach(() => {
		eventBus = new EventBus();
	});

	describe('constructor', () => {
		it('should create with default options', () => {
			const bus = new EventBus();
			expect(bus).toBeInstanceOf(EventBus);
		});

		it('should accept custom maxHistorySize', () => {
			const bus = new EventBus({ maxHistorySize: 50 });
			expect(bus).toBeInstanceOf(EventBus);
		});
	});

	describe('on', () => {
		it('should subscribe to events', () => {
			const handler = vi.fn();
			eventBus.on('test-event', handler);
			eventBus.emit('test-event', { data: 'test' });

			expect(handler).toHaveBeenCalledWith({ data: 'test' });
		});

		it('should receive multiple emissions', () => {
			const handler = vi.fn();
			eventBus.on('test-event', handler);

			eventBus.emit('test-event', 1);
			eventBus.emit('test-event', 2);
			eventBus.emit('test-event', 3);

			expect(handler).toHaveBeenCalledTimes(3);
		});

		it('should return unsubscribe function', () => {
			const handler = vi.fn();
			const unsubscribe = eventBus.on('test-event', handler);

			eventBus.emit('test-event', 'first');
			unsubscribe();
			eventBus.emit('test-event', 'second');

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith('first');
		});

		it('should support multiple handlers for same event', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			eventBus.on('test-event', handler1);
			eventBus.on('test-event', handler2);
			eventBus.emit('test-event', 'data');

			expect(handler1).toHaveBeenCalledWith('data');
			expect(handler2).toHaveBeenCalledWith('data');
		});
	});

	describe('once', () => {
		it('should only receive one emission', () => {
			const handler = vi.fn();
			eventBus.once('test-event', handler);

			eventBus.emit('test-event', 'first');
			eventBus.emit('test-event', 'second');

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenCalledWith('first');
		});

		it('should return unsubscribe function', () => {
			const handler = vi.fn();
			const unsubscribe = eventBus.once('test-event', handler);

			unsubscribe();
			eventBus.emit('test-event', 'data');

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('off', () => {
		it('should remove specific handler', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			eventBus.on('test-event', handler1);
			eventBus.on('test-event', handler2);
			eventBus.off('test-event', handler1);
			eventBus.emit('test-event', 'data');

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).toHaveBeenCalledWith('data');
		});

		it('should handle non-existent event gracefully', () => {
			const handler = vi.fn();
			expect(() => eventBus.off('nonexistent', handler)).not.toThrow();
		});

		it('should clean up empty event subscription sets', () => {
			const handler = vi.fn();
			eventBus.on('test-event', handler);
			eventBus.off('test-event', handler);

			expect(eventBus.listenerCount('test-event')).toBe(0);
		});
	});

	describe('removeAllListeners', () => {
		it('should remove all listeners for specific event', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			eventBus.on('event1', handler1);
			eventBus.on('event2', handler2);
			eventBus.removeAllListeners('event1');

			eventBus.emit('event1', 'data');
			eventBus.emit('event2', 'data');

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).toHaveBeenCalled();
		});

		it('should remove all listeners when no event specified', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			eventBus.on('event1', handler1);
			eventBus.on('event2', handler2);
			eventBus.removeAllListeners();

			eventBus.emit('event1', 'data');
			eventBus.emit('event2', 'data');

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).not.toHaveBeenCalled();
		});
	});

	describe('emit', () => {
		it('should not throw when no handlers', () => {
			expect(() => eventBus.emit('no-handlers', 'data')).not.toThrow();
		});

		it('should handle handler errors gracefully', () => {
			const errorHandler = vi.fn(() => {
				throw new Error('Handler error');
			});
			const successHandler = vi.fn();

			eventBus.on('test-event', errorHandler);
			eventBus.on('test-event', successHandler);

			expect(() => eventBus.emit('test-event', 'data')).not.toThrow();
			expect(successHandler).toHaveBeenCalled();
		});

		it('should add event to history', () => {
			eventBus.emit('test-event', { id: 1 });
			eventBus.emit('test-event', { id: 2 });

			const history = eventBus.getHistory('test-event');
			expect(history).toHaveLength(2);
			expect(history[0]).toEqual({ id: 1 });
			expect(history[1]).toEqual({ id: 2 });
		});
	});

	describe('emitAsync', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should emit asynchronously', async () => {
			const handler = vi.fn();
			eventBus.on('test-event', handler);

			const promise = eventBus.emitAsync('test-event', 'data');

			expect(handler).not.toHaveBeenCalled();

			vi.runAllTimers();
			await promise;

			expect(handler).toHaveBeenCalledWith('data');
		});
	});

	describe('waitFor', () => {
		it('should resolve when event is emitted', async () => {
			const promise = eventBus.waitFor<string>('test-event');

			setTimeout(() => eventBus.emit('test-event', 'data'), 10);

			const result = await promise;
			expect(result).toBe('data');
		});

		it('should reject on timeout', async () => {
			vi.useFakeTimers();

			const promise = eventBus.waitFor('test-event', 100);

			vi.advanceTimersByTime(100);

			await expect(promise).rejects.toThrow('Timeout waiting for event');

			vi.useRealTimers();
		});
	});

	describe('listenerCount', () => {
		it('should return 0 for no listeners', () => {
			expect(eventBus.listenerCount('no-event')).toBe(0);
		});

		it('should return correct count', () => {
			eventBus.on('test-event', vi.fn());
			eventBus.on('test-event', vi.fn());
			eventBus.on('test-event', vi.fn());

			expect(eventBus.listenerCount('test-event')).toBe(3);
		});
	});

	describe('eventNames', () => {
		it('should return empty array when no events', () => {
			expect(eventBus.eventNames()).toEqual([]);
		});

		it('should return list of event names', () => {
			eventBus.on('event1', vi.fn());
			eventBus.on('event2', vi.fn());
			eventBus.on('event3', vi.fn());

			const names = eventBus.eventNames();
			expect(names).toContain('event1');
			expect(names).toContain('event2');
			expect(names).toContain('event3');
		});
	});

	describe('History', () => {
		describe('getHistory', () => {
			it('should return empty array for no history', () => {
				expect(eventBus.getHistory('no-event')).toEqual([]);
			});

			it('should return event history', () => {
				eventBus.emit('test', 1);
				eventBus.emit('test', 2);
				eventBus.emit('test', 3);

				expect(eventBus.getHistory('test')).toEqual([1, 2, 3]);
			});

			it('should respect limit parameter', () => {
				eventBus.emit('test', 1);
				eventBus.emit('test', 2);
				eventBus.emit('test', 3);

				expect(eventBus.getHistory('test', 2)).toEqual([2, 3]);
			});

			it('should return copy of history', () => {
				eventBus.emit('test', 1);
				const history = eventBus.getHistory('test');
				history.push(99);

				expect(eventBus.getHistory('test')).toEqual([1]);
			});
		});

		describe('clearHistory', () => {
			it('should clear specific event history', () => {
				eventBus.emit('event1', 'a');
				eventBus.emit('event2', 'b');
				eventBus.clearHistory('event1');

				expect(eventBus.getHistory('event1')).toEqual([]);
				expect(eventBus.getHistory('event2')).toEqual(['b']);
			});

			it('should clear all history when no event specified', () => {
				eventBus.emit('event1', 'a');
				eventBus.emit('event2', 'b');
				eventBus.clearHistory();

				expect(eventBus.getHistory('event1')).toEqual([]);
				expect(eventBus.getHistory('event2')).toEqual([]);
			});
		});

		describe('maxHistorySize', () => {
			it('should limit history size', () => {
				const bus = new EventBus({ maxHistorySize: 3 });

				bus.emit('test', 1);
				bus.emit('test', 2);
				bus.emit('test', 3);
				bus.emit('test', 4);
				bus.emit('test', 5);

				expect(bus.getHistory('test')).toEqual([3, 4, 5]);
			});
		});
	});

	describe('scope', () => {
		it('should return ScopedEventBus', () => {
			const scoped = eventBus.scope('my-scope');
			expect(scoped).toBeInstanceOf(ScopedEventBus);
		});
	});
});

describe('ScopedEventBus', () => {
	let eventBus: EventBus;
	let scopedBus: ScopedEventBus;

	beforeEach(() => {
		eventBus = new EventBus();
		scopedBus = eventBus.scope('test-scope');
	});

	describe('on', () => {
		it('should prefix events with scope', () => {
			const handler = vi.fn();
			scopedBus.on('event', handler);

			eventBus.emit('test-scope:event', 'data');
			expect(handler).toHaveBeenCalledWith('data');
		});
	});

	describe('once', () => {
		it('should prefix events with scope', () => {
			const handler = vi.fn();
			scopedBus.once('event', handler);

			eventBus.emit('test-scope:event', 'first');
			eventBus.emit('test-scope:event', 'second');

			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe('emit', () => {
		it('should prefix events with scope', () => {
			const handler = vi.fn();
			eventBus.on('test-scope:event', handler);

			scopedBus.emit('event', 'data');
			expect(handler).toHaveBeenCalledWith('data');
		});
	});

	describe('listenerCount', () => {
		it('should return count for scoped event', () => {
			scopedBus.on('event', vi.fn());
			scopedBus.on('event', vi.fn());

			expect(scopedBus.listenerCount('event')).toBe(2);
		});
	});

	describe('eventNames', () => {
		it('should return unscoped event names', () => {
			scopedBus.on('event1', vi.fn());
			scopedBus.on('event2', vi.fn());
			eventBus.on('other', vi.fn());

			const names = scopedBus.eventNames();
			expect(names).toContain('event1');
			expect(names).toContain('event2');
			expect(names).not.toContain('other');
		});
	});

	describe('getHistory', () => {
		it('should return history for scoped event', () => {
			scopedBus.emit('event', 1);
			scopedBus.emit('event', 2);

			expect(scopedBus.getHistory('event')).toEqual([1, 2]);
		});
	});

	describe('clearHistory', () => {
		it('should clear history for scoped event', () => {
			scopedBus.emit('event1', 'a');
			scopedBus.emit('event2', 'b');
			scopedBus.clearHistory('event1');

			expect(scopedBus.getHistory('event1')).toEqual([]);
			expect(scopedBus.getHistory('event2')).toEqual(['b']);
		});

		it('should clear all scoped history when no event specified', () => {
			scopedBus.on('event1', vi.fn());
			scopedBus.on('event2', vi.fn());
			eventBus.on('unscoped', vi.fn());

			scopedBus.emit('event1', 'a');
			scopedBus.emit('event2', 'b');
			eventBus.emit('unscoped', 'c');

			scopedBus.clearHistory();

			expect(scopedBus.getHistory('event1')).toEqual([]);
			expect(scopedBus.getHistory('event2')).toEqual([]);
			expect(eventBus.getHistory('unscoped')).toEqual(['c']);
		});
	});

	describe('removeAllListeners', () => {
		it('should remove listeners for specific scoped event', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			scopedBus.on('event1', handler1);
			scopedBus.on('event2', handler2);
			scopedBus.removeAllListeners('event1');

			scopedBus.emit('event1', 'data');
			scopedBus.emit('event2', 'data');

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).toHaveBeenCalled();
		});

		it('should remove all scoped listeners when no event specified', () => {
			const scopedHandler = vi.fn();
			const unscopedHandler = vi.fn();

			scopedBus.on('event', scopedHandler);
			eventBus.on('unscoped', unscopedHandler);

			scopedBus.removeAllListeners();

			scopedBus.emit('event', 'data');
			eventBus.emit('unscoped', 'data');

			expect(scopedHandler).not.toHaveBeenCalled();
			expect(unscopedHandler).toHaveBeenCalled();
		});
	});
});

describe('createEventBus', () => {
	it('should create EventBus instance', () => {
		const bus = createEventBus();
		expect(bus).toBeInstanceOf(EventBus);
	});

	it('should accept options', () => {
		const bus = createEventBus({ maxHistorySize: 50 });
		expect(bus).toBeInstanceOf(EventBus);
	});
});
