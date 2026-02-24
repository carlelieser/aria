/**
 * Shared Local Library Types
 *
 * Types needed by both plugins (local-library) and presentation layer.
 */

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
