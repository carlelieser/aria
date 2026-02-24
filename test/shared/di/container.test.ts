import { describe, it, expect, beforeEach } from 'vitest';
import { container, ServiceKeys } from '@shared/di/container';

describe('DIContainer', () => {
	beforeEach(() => {
		container.clear();
	});

	describe('register', () => {
		it('should register a factory', () => {
			container.register('testKey', () => 'value');

			expect(container.has('testKey')).toBe(true);
		});

		it('should register as singleton by default', () => {
			let callCount = 0;
			container.register('counter', () => {
				callCount++;
				return callCount;
			});

			const first = container.resolve<number>('counter');
			const second = container.resolve<number>('counter');

			expect(first).toBe(second);
			expect(callCount).toBe(1);
		});

		it('should register as transient when singleton is false', () => {
			let callCount = 0;
			container.register(
				'counter',
				() => {
					callCount++;
					return callCount;
				},
				false
			);

			const first = container.resolve<number>('counter');
			const second = container.resolve<number>('counter');

			expect(first).toBe(1);
			expect(second).toBe(2);
			expect(callCount).toBe(2);
		});
	});

	describe('registerInstance', () => {
		it('should register a pre-created instance', () => {
			const instance = { name: 'test' };
			container.registerInstance('service', instance);

			const resolved = container.resolve<{ name: string }>('service');

			expect(resolved).toBe(instance);
		});

		it('should always return the same instance', () => {
			const instance = { name: 'test' };
			container.registerInstance('service', instance);

			const first = container.resolve('service');
			const second = container.resolve('service');

			expect(first).toBe(second);
			expect(first).toBe(instance);
		});
	});

	describe('resolve', () => {
		it('should resolve a registered factory', () => {
			container.register('greeting', () => 'hello');

			const result = container.resolve<string>('greeting');

			expect(result).toBe('hello');
		});

		it('should throw when resolving unregistered key', () => {
			expect(() => container.resolve('nonexistent')).toThrow(
				'No registration found for key: nonexistent'
			);
		});

		it('should lazily create singleton on first resolve', () => {
			let created = false;
			container.register('lazy', () => {
				created = true;
				return 'value';
			});

			expect(created).toBe(false);

			container.resolve('lazy');

			expect(created).toBe(true);
		});

		it('should return correct type', () => {
			container.register('number', () => 42);

			const result = container.resolve<number>('number');

			expect(typeof result).toBe('number');
			expect(result).toBe(42);
		});
	});

	describe('has', () => {
		it('should return true for registered key', () => {
			container.register('exists', () => 'value');

			expect(container.has('exists')).toBe(true);
		});

		it('should return false for unregistered key', () => {
			expect(container.has('does-not-exist')).toBe(false);
		});
	});

	describe('unregister', () => {
		it('should remove a registration', () => {
			container.register('toRemove', () => 'value');

			container.unregister('toRemove');

			expect(container.has('toRemove')).toBe(false);
		});

		it('should not throw when unregistering non-existent key', () => {
			expect(() => container.unregister('nonexistent')).not.toThrow();
		});

		it('should cause resolve to throw after unregister', () => {
			container.register('temp', () => 'value');
			container.unregister('temp');

			expect(() => container.resolve('temp')).toThrow();
		});
	});

	describe('clear', () => {
		it('should remove all registrations', () => {
			container.register('a', () => 1);
			container.register('b', () => 2);
			container.register('c', () => 3);

			container.clear();

			expect(container.has('a')).toBe(false);
			expect(container.has('b')).toBe(false);
			expect(container.has('c')).toBe(false);
		});

		it('should result in empty keys list', () => {
			container.register('a', () => 1);

			container.clear();

			expect(container.keys()).toEqual([]);
		});
	});

	describe('keys', () => {
		it('should return empty array when no registrations', () => {
			expect(container.keys()).toEqual([]);
		});

		it('should return all registered keys', () => {
			container.register('key1', () => 1);
			container.register('key2', () => 2);

			const keys = container.keys();

			expect(keys).toContain('key1');
			expect(keys).toContain('key2');
			expect(keys).toHaveLength(2);
		});
	});

	describe('ServiceKeys', () => {
		it('should define expected service keys', () => {
			expect(ServiceKeys.TRACK_REPOSITORY).toBe('TrackRepository');
			expect(ServiceKeys.PLAYLIST_REPOSITORY).toBe('PlaylistRepository');
			expect(ServiceKeys.STORAGE_REPOSITORY).toBe('StorageRepository');
			expect(ServiceKeys.PLAYBACK_SERVICE).toBe('PlaybackService');
			expect(ServiceKeys.SEARCH_SERVICE).toBe('SearchService');
			expect(ServiceKeys.LIBRARY_SERVICE).toBe('LibraryService');
			expect(ServiceKeys.PLUGIN_REGISTRY).toBe('PluginRegistry');
			expect(ServiceKeys.AUDIO_PLAYER).toBe('AudioPlayer');
			expect(ServiceKeys.EVENT_BUS).toBe('EventBus');
		});
	});
});
