import { container, ServiceKeys } from '../../shared/di/container';
import { asyncStorageRepository } from '../storage/async-storage-repository';
import { expoAudioPlaybackProvider } from '../../plugins/playback/expo-av';
import { localFilesProvider } from '../../plugins/metadata/local-files';

/**
 * Initialize the dependency injection container with infrastructure dependencies.
 * This function wires up all the concrete implementations.
 *
 * Call this function during app initialization, before any services are used.
 */
export async function initializeContainer(): Promise<void> {
  // Register storage repository
  container.registerInstance(ServiceKeys.STORAGE_REPOSITORY, asyncStorageRepository);

  // Register playback provider
  // Initialize the playback provider using onInit before registering
  const playbackInitResult = await expoAudioPlaybackProvider.onInit({
    manifest: expoAudioPlaybackProvider.manifest,
    eventBus: {
      emit: () => {},
      on: () => () => {},
      once: () => () => {},
      off: () => {},
    },
    config: {},
    logger: {
      debug: console.debug.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    },
  });

  if (!playbackInitResult.success) {
    throw new Error(`Failed to initialize playback provider: ${playbackInitResult.error.message}`);
  }

  container.registerInstance('PlaybackProvider', expoAudioPlaybackProvider);

  // Register metadata providers
  const localFilesInitResult = await localFilesProvider.onInit({
    manifest: localFilesProvider.manifest,
    eventBus: {
      emit: () => {},
      on: () => () => {},
      once: () => () => {},
      off: () => {},
    },
    config: {},
    logger: {
      debug: console.debug.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    },
  });

  if (!localFilesInitResult.success) {
    throw new Error(`Failed to initialize local files provider: ${localFilesInitResult.error.message}`);
  }

  container.registerInstance('MetadataProvider:LocalFiles', localFilesProvider);

  // Note: Additional plugins (YouTube Music, etc.) should be registered here
  // when they are implemented
}

/**
 * Clean up and dispose of all registered services.
 * Call this during app shutdown or cleanup.
 */
export async function disposeContainer(): Promise<void> {
  // Dispose playback provider
  if (container.has('PlaybackProvider')) {
    const playbackProvider = container.resolve<typeof expoAudioPlaybackProvider>('PlaybackProvider');
    await playbackProvider.onDestroy();
  }

  // Dispose metadata providers
  if (container.has('MetadataProvider:LocalFiles')) {
    const localFiles = container.resolve<typeof localFilesProvider>('MetadataProvider:LocalFiles');
    await localFiles.onDestroy();
  }

  // Clear all registrations
  container.clear();
}

/**
 * Get the storage repository from the container
 */
export function getStorageRepository() {
  return container.resolve<typeof asyncStorageRepository>(ServiceKeys.STORAGE_REPOSITORY);
}

/**
 * Get the playback provider from the container
 */
export function getPlaybackProvider() {
  return container.resolve<typeof expoAudioPlaybackProvider>('PlaybackProvider');
}

/**
 * Get a metadata provider by ID from the container
 */
export function getMetadataProvider(providerId: string) {
  const key = `MetadataProvider:${providerId}`;
  if (!container.has(key)) {
    throw new Error(`Metadata provider not found: ${providerId}`);
  }
  return container.resolve(key);
}

// Re-export the container and service keys for convenience
export { container, ServiceKeys };
