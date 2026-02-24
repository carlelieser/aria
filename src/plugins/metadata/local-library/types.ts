import type { AudioFileType } from '@domain/value-objects/audio-source';

// Re-export shared types for backward compatibility
export type {
	LocalTrack,
	LocalAlbum,
	LocalArtist,
	ScanProgress,
	FolderInfo,
} from '@shared/types/local-library-types';

export interface ScannedFile {
	readonly uri: string;
	readonly name: string;
	readonly size: number;
	readonly modifiedTime: number;
	readonly extension: AudioFileType;
}

export interface ParsedMetadata {
	readonly title?: string;
	readonly artist?: string;
	readonly album?: string;
	readonly albumArtist?: string;
	readonly year?: number;
	readonly genre?: string;
	readonly trackNumber?: number;
	readonly discNumber?: number;
	readonly duration: number;
	readonly bitrate?: number;
	readonly sampleRate?: number;
	readonly codec?: string;
	readonly artwork?: EmbeddedArtwork;
}

export interface EmbeddedArtwork {
	readonly data: Uint8Array;
	readonly mimeType: string;
}

export const SUPPORTED_EXTENSIONS: AudioFileType[] = [
	'mp3',
	'flac',
	'aac',
	'm4a',
	'wav',
	'ogg',
	'opus',
];

export const MIME_TYPE_MAP: Record<string, AudioFileType> = {
	'audio/mpeg': 'mp3',
	'audio/mp3': 'mp3',
	'audio/flac': 'flac',
	'audio/x-flac': 'flac',
	'audio/aac': 'aac',
	'audio/x-m4a': 'm4a',
	'audio/mp4': 'm4a',
	'audio/wav': 'wav',
	'audio/x-wav': 'wav',
	'audio/ogg': 'ogg',
	'audio/opus': 'opus',
};
