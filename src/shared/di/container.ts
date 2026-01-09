type Factory<T> = () => T;

interface Registration<T> {
	factory: Factory<T>;
	singleton: boolean;
	instance?: T;
}

class DIContainer {
	private registrations = new Map<string, Registration<unknown>>();

	register<T>(key: string, factory: Factory<T>, singleton = true): void {
		this.registrations.set(key, { factory, singleton });
	}

	registerInstance<T>(key: string, instance: T): void {
		this.registrations.set(key, {
			factory: () => instance,
			singleton: true,
			instance,
		});
	}

	resolve<T>(key: string): T {
		const registration = this.registrations.get(key);

		if (!registration) {
			throw new Error(`No registration found for key: ${key}`);
		}

		if (registration.singleton) {
			if (registration.instance === undefined) {
				registration.instance = registration.factory();
			}
			return registration.instance as T;
		}

		return registration.factory() as T;
	}

	has(key: string): boolean {
		return this.registrations.has(key);
	}

	unregister(key: string): void {
		this.registrations.delete(key);
	}

	clear(): void {
		this.registrations.clear();
	}

	keys(): string[] {
		return Array.from(this.registrations.keys());
	}
}

export const container = new DIContainer();

export { DIContainer };

export const ServiceKeys = {
	TRACK_REPOSITORY: 'TrackRepository',
	PLAYLIST_REPOSITORY: 'PlaylistRepository',
	STORAGE_REPOSITORY: 'StorageRepository',

	PLAYBACK_SERVICE: 'PlaybackService',
	SEARCH_SERVICE: 'SearchService',
	LIBRARY_SERVICE: 'LibraryService',

	PLUGIN_REGISTRY: 'PluginRegistry',

	AUDIO_PLAYER: 'AudioPlayer',
	EVENT_BUS: 'EventBus',
} as const;
