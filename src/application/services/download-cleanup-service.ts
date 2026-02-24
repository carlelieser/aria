/**
 * Download Cleanup Service
 *
 * Application-layer facade for download file operations.
 * Wraps infrastructure-level filesystem operations so hooks
 * do not need to import from the infrastructure layer directly.
 */

import { clearAllDownloads } from '@infrastructure/filesystem/download-manager';
import type { Result } from '@shared/types/result';

export async function clearDownloadedFiles(): Promise<Result<void, Error>> {
	return clearAllDownloads();
}
