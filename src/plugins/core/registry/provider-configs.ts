/**
 * Provider type configurations for the plugin registry
 */

import type { MetadataProvider } from '../interfaces/metadata-provider';
import { isMetadataProvider } from '../interfaces/metadata-provider';
import type { PlaybackProvider } from '../interfaces/playback-provider';
import { isPlaybackProvider } from '../interfaces/playback-provider';
import type { SyncProvider } from '../interfaces/sync-provider';
import { isSyncProvider } from '../interfaces/sync-provider';
import type { AudioSourceProvider } from '../interfaces/audio-source-provider';
import { isAudioSourceProvider } from '../interfaces/audio-source-provider';
import type { ProviderConfig } from './provider-registry-helper';

export const PROVIDER_CONFIGS = {
  metadata: {
    category: 'metadata-provider',
    typeGuard: isMetadataProvider,
  } as ProviderConfig<MetadataProvider>,

  playback: {
    category: 'playback-provider',
    typeGuard: isPlaybackProvider,
  } as ProviderConfig<PlaybackProvider>,

  sync: {
    category: 'sync-provider',
    typeGuard: isSyncProvider,
  } as ProviderConfig<SyncProvider>,

  audioSource: {
    category: 'audio-source-provider',
    typeGuard: isAudioSourceProvider,
  } as ProviderConfig<AudioSourceProvider>,
} as const;
