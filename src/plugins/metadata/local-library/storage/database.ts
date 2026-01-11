import * as SQLite from 'expo-sqlite';
import { ok, err, type AsyncResult } from '@shared/types/result';
import type { LocalTrack, LocalAlbum, LocalArtist } from '../types';

const DB_NAME = 'local-library.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function initializeDatabase(): AsyncResult<void, Error> {
	try {
		db = await SQLite.openDatabaseAsync(DB_NAME);

		// Create tables
		await db.execAsync(`
			CREATE TABLE IF NOT EXISTS tracks (
				id TEXT PRIMARY KEY,
				file_path TEXT NOT NULL UNIQUE,
				file_name TEXT NOT NULL,
				file_size INTEGER NOT NULL,
				title TEXT NOT NULL,
				artist_name TEXT NOT NULL,
				artist_id TEXT NOT NULL,
				album_name TEXT,
				album_id TEXT,
				duration REAL NOT NULL,
				year INTEGER,
				genre TEXT,
				track_number INTEGER,
				disc_number INTEGER,
				artwork_path TEXT,
				added_at INTEGER NOT NULL,
				modified_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS tracks_fts (
				id TEXT,
				title TEXT,
				artist_name TEXT,
				album_name TEXT
			);

			CREATE VIRTUAL TABLE IF NOT EXISTS tracks_search USING fts5(
				id UNINDEXED,
				title,
				artist_name,
				album_name,
				content='tracks_fts',
				content_rowid='rowid'
			);

			CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id);
			CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);
			CREATE INDEX IF NOT EXISTS idx_tracks_file_path ON tracks(file_path);
		`);

		return ok(undefined);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to initialize database: ${String(error)}`)
		);
	}
}

export async function closeDatabase(): AsyncResult<void, Error> {
	try {
		if (db) {
			await db.closeAsync();
			db = null;
		}
		return ok(undefined);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to close database: ${String(error)}`)
		);
	}
}

export async function indexTrack(track: LocalTrack): AsyncResult<void, Error> {
	if (!db) {
		return err(new Error('Database not initialized'));
	}

	try {
		await db.runAsync(
			`INSERT OR REPLACE INTO tracks
			(id, file_path, file_name, file_size, title, artist_name, artist_id,
			 album_name, album_id, duration, year, genre, track_number, disc_number,
			 artwork_path, added_at, modified_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				track.id,
				track.filePath,
				track.fileName,
				track.fileSize,
				track.title,
				track.artistName,
				track.artistId,
				track.albumName ?? null,
				track.albumId ?? null,
				track.duration,
				track.year ?? null,
				track.genre ?? null,
				track.trackNumber ?? null,
				track.discNumber ?? null,
				track.artworkPath ?? null,
				track.addedAt,
				track.modifiedAt,
			]
		);

		// Update FTS index
		await db.runAsync(
			`INSERT OR REPLACE INTO tracks_fts (id, title, artist_name, album_name)
			 VALUES (?, ?, ?, ?)`,
			[track.id, track.title, track.artistName, track.albumName ?? '']
		);

		return ok(undefined);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to index track: ${String(error)}`)
		);
	}
}

export async function indexTracks(tracks: LocalTrack[]): AsyncResult<void, Error> {
	if (!db) {
		return err(new Error('Database not initialized'));
	}

	try {
		await db.withTransactionAsync(async () => {
			for (const track of tracks) {
				await db!.runAsync(
					`INSERT OR REPLACE INTO tracks
					(id, file_path, file_name, file_size, title, artist_name, artist_id,
					 album_name, album_id, duration, year, genre, track_number, disc_number,
					 artwork_path, added_at, modified_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						track.id,
						track.filePath,
						track.fileName,
						track.fileSize,
						track.title,
						track.artistName,
						track.artistId,
						track.albumName ?? null,
						track.albumId ?? null,
						track.duration,
						track.year ?? null,
						track.genre ?? null,
						track.trackNumber ?? null,
						track.discNumber ?? null,
						track.artworkPath ?? null,
						track.addedAt,
						track.modifiedAt,
					]
				);

				await db!.runAsync(
					`INSERT OR REPLACE INTO tracks_fts (id, title, artist_name, album_name)
					 VALUES (?, ?, ?, ?)`,
					[track.id, track.title, track.artistName, track.albumName ?? '']
				);
			}
		});

		return ok(undefined);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to index tracks: ${String(error)}`)
		);
	}
}

export async function removeTrack(trackId: string): AsyncResult<void, Error> {
	if (!db) {
		return err(new Error('Database not initialized'));
	}

	try {
		await db.runAsync('DELETE FROM tracks WHERE id = ?', [trackId]);
		await db.runAsync('DELETE FROM tracks_fts WHERE id = ?', [trackId]);
		return ok(undefined);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to remove track: ${String(error)}`)
		);
	}
}

export async function removeTracksForFolder(folderUri: string): AsyncResult<void, Error> {
	if (!db) {
		return err(new Error('Database not initialized'));
	}

	try {
		// Get track IDs first for FTS cleanup
		const rows = await db.getAllAsync<{ id: string }>(
			'SELECT id FROM tracks WHERE file_path LIKE ?',
			[`${folderUri}%`]
		);

		await db.runAsync('DELETE FROM tracks WHERE file_path LIKE ?', [`${folderUri}%`]);

		for (const row of rows) {
			await db.runAsync('DELETE FROM tracks_fts WHERE id = ?', [row.id]);
		}

		return ok(undefined);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to remove tracks: ${String(error)}`)
		);
	}
}

export interface SearchResult {
	id: string;
	title: string;
	artistName: string;
	albumName: string | null;
}

export async function searchTracks(
	query: string,
	limit: number = 50,
	offset: number = 0
): AsyncResult<SearchResult[], Error> {
	if (!db) {
		return err(new Error('Database not initialized'));
	}

	try {
		// Use FTS5 match for full-text search
		const escapedQuery = query.replace(/['"]/g, '').trim();
		if (!escapedQuery) {
			return ok([]);
		}

		const rows = await db.getAllAsync<SearchResult>(
			`SELECT t.id, t.title, t.artist_name as artistName, t.album_name as albumName
			 FROM tracks t
			 WHERE t.id IN (
				 SELECT id FROM tracks_fts
				 WHERE title LIKE ? OR artist_name LIKE ? OR album_name LIKE ?
			 )
			 LIMIT ? OFFSET ?`,
			[`%${escapedQuery}%`, `%${escapedQuery}%`, `%${escapedQuery}%`, limit, offset]
		);

		return ok(rows);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Search failed: ${String(error)}`)
		);
	}
}

export async function getTrackCount(): AsyncResult<number, Error> {
	if (!db) {
		return err(new Error('Database not initialized'));
	}

	try {
		const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tracks');
		return ok(result?.count ?? 0);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to get track count: ${String(error)}`)
		);
	}
}

export async function getAllTracks(): AsyncResult<LocalTrack[], Error> {
	if (!db) {
		return err(new Error('Database not initialized'));
	}

	try {
		const rows = await db.getAllAsync<{
			id: string;
			file_path: string;
			file_name: string;
			file_size: number;
			title: string;
			artist_name: string;
			artist_id: string;
			album_name: string | null;
			album_id: string | null;
			duration: number;
			year: number | null;
			genre: string | null;
			track_number: number | null;
			disc_number: number | null;
			artwork_path: string | null;
			added_at: number;
			modified_at: number;
		}>('SELECT * FROM tracks');

		const tracks: LocalTrack[] = rows.map((row) => ({
			id: row.id,
			filePath: row.file_path,
			fileName: row.file_name,
			fileSize: row.file_size,
			title: row.title,
			artistName: row.artist_name,
			artistId: row.artist_id,
			albumName: row.album_name ?? undefined,
			albumId: row.album_id ?? undefined,
			duration: row.duration,
			year: row.year ?? undefined,
			genre: row.genre ?? undefined,
			trackNumber: row.track_number ?? undefined,
			discNumber: row.disc_number ?? undefined,
			artworkPath: row.artwork_path ?? undefined,
			addedAt: row.added_at,
			modifiedAt: row.modified_at,
		}));

		return ok(tracks);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to get tracks: ${String(error)}`)
		);
	}
}

export async function clearDatabase(): AsyncResult<void, Error> {
	if (!db) {
		return err(new Error('Database not initialized'));
	}

	try {
		await db.execAsync(`
			DELETE FROM tracks;
			DELETE FROM tracks_fts;
		`);
		return ok(undefined);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to clear database: ${String(error)}`)
		);
	}
}
