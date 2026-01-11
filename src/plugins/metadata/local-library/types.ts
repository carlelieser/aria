import type { AudioFileType } from '@domain/value-objects/audio-source';

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

export interface LocalTrack {
	readonly id: string;
	readonly filePath: string;
	readonly fileName: string;
	readonly fileSize: number;
	readonly title: string;
	readonly artistName: string;
	readonly artistId: string;
	readonly albumName?: string;
	readonly albumId?: string;
	readonly duration: number;
	readonly year?: number;
	readonly genre?: string;
	readonly trackNumber?: number;
	readonly discNumber?: number;
	readonly artworkPath?: string;
	readonly addedAt: number;
	readonly modifiedAt: number;
}

export interface LocalAlbum {
	readonly id: string;
	readonly name: string;
	readonly artistId: string;
	readonly artistName: string;
	readonly year?: number;
	readonly trackCount: number;
	readonly totalDuration: number;
	readonly artworkPath?: string;
}

export interface LocalArtist {
	readonly id: string;
	readonly name: string;
	readonly albumCount: number;
	readonly trackCount: number;
}

export interface ScanProgress {
	readonly current: number;
	readonly total: number;
	readonly currentFile?: string;
	readonly phase: 'enumerating' | 'scanning' | 'indexing' | 'complete';
}

export interface FolderInfo {
	readonly uri: string;
	readonly name: string;
	readonly trackCount: number;
	readonly lastScannedAt: number | null;
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
