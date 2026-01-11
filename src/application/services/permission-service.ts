/**
 * Permission Service
 *
 * Centralized service for managing permission requests.
 * Handles request deduplication to prevent concurrent permission dialogs.
 */

import { Platform } from 'react-native';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import type { Result, AsyncResult } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('PermissionService');

export interface DirectoryPermissionResult {
	readonly uri: string;
	readonly name: string;
}

type PermissionType = 'directory';

type PendingRequest<T> = Promise<Result<T, Error>>;

export class PermissionService {
	private _pendingRequests: Map<PermissionType, PendingRequest<unknown>> = new Map();

	/**
	 * Request directory access permission.
	 * Returns the selected directory URI and name.
	 * On Android, uses Storage Access Framework.
	 * On iOS, uses Document Picker.
	 */
	async requestDirectoryPermission(): AsyncResult<DirectoryPermissionResult, Error> {
		return this._deduplicateRequest('directory', () => this._requestDirectoryInternal());
	}

	/**
	 * Check if a permission request is currently in progress.
	 */
	isRequestInProgress(type: PermissionType): boolean {
		return this._pendingRequests.has(type);
	}

	private async _deduplicateRequest<T>(
		type: PermissionType,
		requestFn: () => AsyncResult<T, Error>
	): AsyncResult<T, Error> {
		const pending = this._pendingRequests.get(type);

		if (pending) {
			logger.debug(`Permission request '${type}' already in progress, awaiting existing request`);
			return pending as PendingRequest<T>;
		}

		logger.debug(`Starting permission request: ${type}`);
		const request = requestFn();
		this._pendingRequests.set(type, request as PendingRequest<unknown>);

		try {
			const result = await request;
			logger.debug(`Permission request '${type}' completed: ${result.success ? 'granted' : 'denied'}`);
			return result;
		} finally {
			this._pendingRequests.delete(type);
		}
	}

	private async _requestDirectoryInternal(): AsyncResult<DirectoryPermissionResult, Error> {
		try {
			logger.debug(`Requesting directory permission on ${Platform.OS}`);
			if (Platform.OS === 'android') {
				return this._requestDirectoryAndroid();
			}
			return this._requestDirectoryIOS();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.error('Directory permission request failed', new Error(message));
			return err(new Error(`Failed to request directory permission: ${message}`));
		}
	}

	private async _requestDirectoryAndroid(): AsyncResult<DirectoryPermissionResult, Error> {
		const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();

		if (!permissions.granted) {
			return err(new Error('Directory selection cancelled'));
		}

		const name = this._extractFolderNameFromUri(permissions.directoryUri);

		return ok({
			uri: permissions.directoryUri,
			name,
		});
	}

	private async _requestDirectoryIOS(): AsyncResult<DirectoryPermissionResult, Error> {
		logger.debug('Opening iOS directory picker with public.folder type');

		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: 'public.folder',
				copyToCacheDirectory: false,
				multiple: false,
			});

			logger.debug(`iOS picker result: canceled=${result.canceled}, assets=${result.assets?.length ?? 0}`);

			if (result.canceled || !result.assets || result.assets.length === 0) {
				return err(new Error('Directory selection cancelled'));
			}

			const asset = result.assets[0];
			logger.info(`iOS directory selected: ${asset.name} at ${asset.uri}`);

			return ok({
				uri: asset.uri,
				name: asset.name || 'Selected Folder',
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.error('iOS directory picker failed', new Error(message));
			return err(new Error(`iOS directory picker failed: ${message}`));
		}
	}

	private _extractFolderNameFromUri(uri: string): string {
		const decoded = decodeURIComponent(uri);
		// SAF URIs look like: content://com.android.externalstorage.documents/tree/primary%3AMusic
		// Extract the last segment after the colon
		const match = decoded.match(/:([^/]+)$/);
		if (match) {
			return match[1];
		}
		// Fallback: get last path segment
		const parts = decoded.split('/');
		return parts[parts.length - 1] || 'Selected Folder';
	}
}

export const permissionService = new PermissionService();
