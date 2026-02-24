/**
 * Shared Plugin Types
 *
 * Plugin status and category types used across layers.
 * Canonical definitions live here; plugin core re-exports them.
 */

export type PluginStatus =
	| 'uninitialized'
	| 'initializing'
	| 'ready'
	| 'active'
	| 'error'
	| 'disabled';

export type PluginCategory =
	| 'metadata-provider'
	| 'audio-source-provider'
	| 'playback-provider'
	| 'sync-provider'
	| 'lyrics-provider'
	| 'recommendation'
	| 'visualizer'
	| 'actions-provider';
