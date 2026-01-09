/**
 * Simple dependency injection container.
 * Supports singleton and transient registrations.
 */

type Factory<T> = () => T;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

class DIContainer {
  private registrations = new Map<string, Registration<unknown>>();

  /**
   * Register a factory for a given key.
   * @param key - Unique identifier for the dependency
   * @param factory - Factory function that creates the instance
   * @param singleton - If true, the same instance is returned on every resolve (default: true)
   */
  register<T>(key: string, factory: Factory<T>, singleton = true): void {
    this.registrations.set(key, { factory, singleton });
  }

  /**
   * Register a pre-created instance.
   * Always acts as a singleton.
   */
  registerInstance<T>(key: string, instance: T): void {
    this.registrations.set(key, {
      factory: () => instance,
      singleton: true,
      instance,
    });
  }

  /**
   * Resolve a dependency by key.
   * @throws Error if the key is not registered
   */
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

  /**
   * Check if a key is registered.
   */
  has(key: string): boolean {
    return this.registrations.has(key);
  }

  /**
   * Remove a registration.
   */
  unregister(key: string): void {
    this.registrations.delete(key);
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    this.registrations.clear();
  }

  /**
   * Get all registered keys.
   */
  keys(): string[] {
    return Array.from(this.registrations.keys());
  }
}

// Global container instance
export const container = new DIContainer();

// Export class for testing or creating additional containers
export { DIContainer };

// Well-known service keys
export const ServiceKeys = {
  // Repositories
  TRACK_REPOSITORY: 'TrackRepository',
  PLAYLIST_REPOSITORY: 'PlaylistRepository',
  STORAGE_REPOSITORY: 'StorageRepository',

  // Services
  PLAYBACK_SERVICE: 'PlaybackService',
  SEARCH_SERVICE: 'SearchService',
  LIBRARY_SERVICE: 'LibraryService',

  // Plugins
  PLUGIN_REGISTRY: 'PluginRegistry',

  // Infrastructure
  AUDIO_PLAYER: 'AudioPlayer',
  EVENT_BUS: 'EventBus',
} as const;
