import { container, ServiceKeys } from '../../shared/di/container';
import { asyncStorageRepository } from '../storage/async-storage-repository';
import { expoAudioPlaybackProvider } from '../../plugins/playback/expo-av';
import { localFilesProvider } from '../../plugins/metadata/local-files';
import { getLogger } from '../../shared/services/logger';

const playbackLogger = getLogger('PlaybackProvider');
const metadataLogger = getLogger('MetadataProvider');

export async function initializeContainer(): Promise<void> {
	container.registerInstance(ServiceKeys.STORAGE_REPOSITORY, asyncStorageRepository);

	const playbackInitResult = await expoAudioPlaybackProvider.onInit({
		manifest: expoAudioPlaybackProvider.manifest,
		eventBus: {
			emit: () => {},
			on: () => () => {},
			once: () => () => {},
			off: () => {},
		},
		config: {},
		logger: playbackLogger,
	});

	if (!playbackInitResult.success) {
		throw new Error(
			`Failed to initialize playback provider: ${playbackInitResult.error.message}`
		);
	}

	container.registerInstance('PlaybackProvider', expoAudioPlaybackProvider);

	const localFilesInitResult = await localFilesProvider.onInit({
		manifest: localFilesProvider.manifest,
		eventBus: {
			emit: () => {},
			on: () => () => {},
			once: () => () => {},
			off: () => {},
		},
		config: {},
		logger: metadataLogger,
	});

	if (!localFilesInitResult.success) {
		throw new Error(
			`Failed to initialize local files provider: ${localFilesInitResult.error.message}`
		);
	}

	container.registerInstance('MetadataProvider:LocalFiles', localFilesProvider);
}

export async function disposeContainer(): Promise<void> {
	if (container.has('PlaybackProvider')) {
		const playbackProvider =
			container.resolve<typeof expoAudioPlaybackProvider>('PlaybackProvider');
		await playbackProvider.onDestroy();
	}

	if (container.has('MetadataProvider:LocalFiles')) {
		const localFiles = container.resolve<typeof localFilesProvider>(
			'MetadataProvider:LocalFiles'
		);
		await localFiles.onDestroy();
	}

	container.clear();
}

export function getStorageRepository() {
	return container.resolve<typeof asyncStorageRepository>(ServiceKeys.STORAGE_REPOSITORY);
}

export function getPlaybackProvider() {
	return container.resolve<typeof expoAudioPlaybackProvider>('PlaybackProvider');
}

export function getMetadataProvider(providerId: string) {
	const key = `MetadataProvider:${providerId}`;
	if (!container.has(key)) {
		throw new Error(`Metadata provider not found: ${providerId}`);
	}
	return container.resolve(key);
}

export { container, ServiceKeys };
