import { err, type AsyncResult } from '@shared/types/result';
import type { ScanProgress } from '../types';

/**
 * Manages scanning state to prevent concurrent scans.
 */
export class ScanStateManager {
	private _isScanning = false;
	private _scanProgress: ScanProgress | null = null;

	isScanning(): boolean {
		return this._isScanning;
	}

	getScanProgress(): ScanProgress | null {
		return this._scanProgress;
	}

	setScanProgress(progress: ScanProgress | null): void {
		this._scanProgress = progress;
	}

	async executeWithScanLock<T>(operation: () => AsyncResult<T, Error>): AsyncResult<T, Error> {
		if (this._isScanning) {
			return Promise.resolve(err(new Error('Scan already in progress')));
		}

		try {
			this._isScanning = true;
			return await operation();
		} finally {
			this._isScanning = false;
			this._scanProgress = null;
		}
	}
}
