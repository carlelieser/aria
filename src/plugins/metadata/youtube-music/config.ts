/**
 * YouTube Music Provider configuration
 */

import type {
  PluginConfigSchema,
  PluginManifest,
} from '@plugins/core/interfaces/base-plugin';
import type { MetadataCapability } from '@plugins/core/interfaces/metadata-provider';
import type { AudioSourceCapability } from '@plugins/core/interfaces/audio-source-provider';

/**
 * YouTube Music Provider configuration
 */
export interface YouTubeMusicConfig {
  lang?: string;
  location?: string;
  enableLogging?: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: YouTubeMusicConfig = {
  lang: 'en',
  enableLogging: false,
};

/**
 * Plugin manifest
 */
export const PLUGIN_MANIFEST: PluginManifest = {
  id: 'youtube-music',
  name: 'YouTube Music',
  description: 'Stream music from YouTube Music with rich metadata',
  version: '1.0.0',
  author: 'Aria',
  category: 'metadata-provider',
  capabilities: [
    'search-tracks',
    'search-albums',
    'search-artists',
    'get-track-info',
    'get-album-info',
    'get-artist-info',
    'get-recommendations',
  ],
};

/**
 * Configuration schema for UI
 */
export const CONFIG_SCHEMA: PluginConfigSchema[] = [
  {
    key: 'lang',
    type: 'string',
    label: 'Language',
    description: 'Language code for YouTube Music',
    defaultValue: 'en',
  },
  {
    key: 'location',
    type: 'string',
    label: 'Location',
    description: 'Location code for regional content',
    required: false,
  },
];

/**
 * Metadata capabilities
 */
export const METADATA_CAPABILITIES: MetadataCapability[] = [
  'search-tracks',
  'search-albums',
  'search-artists',
  'get-track-info',
  'get-album-info',
  'get-artist-info',
  'get-recommendations',
];

/**
 * Audio source capabilities
 */
export const AUDIO_CAPABILITIES: AudioSourceCapability[] = [
  'get-stream-url',
  'quality-selection',
];
