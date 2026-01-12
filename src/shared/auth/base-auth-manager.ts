/**
 * Base Authentication Manager
 *
 * Abstract base class for cookie-based authentication managers.
 * Handles common patterns like AsyncStorage persistence, logout, and state management.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Result } from '../types/result';
import { ok, err } from '../types/result';

/**
 * Base authentication state interface.
 * Extended by provider-specific auth states.
 */
export interface BaseAuthState {
	readonly isAuthenticated: boolean;
}

/**
 * Configuration for the base auth manager.
 */
export interface BaseAuthManagerConfig {
	readonly storageKey: string;
	readonly loginUrl: string;
}

/**
 * Abstract base class for authentication managers.
 * Provides common functionality for credential storage and retrieval.
 *
 * @template TStoredAuth - The type of data stored in AsyncStorage
 * @template TAuthState - The auth state type returned by getAuthState()
 */
export abstract class BaseAuthManager<TStoredAuth, TAuthState extends BaseAuthState> {
	protected readonly storageKey: string;
	protected readonly loginUrl: string;

	constructor(config: BaseAuthManagerConfig) {
		this.storageKey = config.storageKey;
		this.loginUrl = config.loginUrl;
	}

	/**
	 * Returns the URL to redirect users for authentication.
	 */
	getLoginUrl(): string {
		return this.loginUrl;
	}

	/**
	 * Returns whether the user is currently authenticated.
	 */
	abstract isAuthenticated(): boolean;

	/**
	 * Returns the current authentication state.
	 */
	abstract getAuthState(): TAuthState;

	/**
	 * Clears in-memory credentials.
	 * Called during logout and on failed authentication.
	 */
	protected abstract clearCredentials(): void;

	/**
	 * Serializes credentials for storage.
	 * Return null if there's nothing to store.
	 */
	protected abstract serializeForStorage(): TStoredAuth | null;

	/**
	 * Deserializes stored credentials.
	 */
	protected abstract deserializeFromStorage(stored: TStoredAuth): void;

	/**
	 * Loads stored authentication from AsyncStorage.
	 * Returns true if credentials were found and loaded.
	 */
	async loadStoredAuth(): Promise<Result<boolean, Error>> {
		return this._loadStoredAuth();
	}

	/**
	 * Checks if authenticated, loading from storage if needed.
	 */
	async checkAuthentication(): Promise<boolean> {
		if (!this.isAuthenticated()) {
			await this._loadStoredAuth();
		}
		return this.isAuthenticated();
	}

	/**
	 * Logs out by clearing credentials and removing stored data.
	 */
	async logout(): Promise<Result<void, Error>> {
		try {
			this.clearCredentials();
			await AsyncStorage.removeItem(this.storageKey);
			return ok(undefined);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Persists current credentials to AsyncStorage.
	 * Call this after successfully setting credentials.
	 */
	protected async persistCredentials(): Promise<void> {
		const stored = this.serializeForStorage();
		if (stored) {
			await AsyncStorage.setItem(this.storageKey, JSON.stringify(stored));
		}
	}

	/**
	 * Loads and deserializes stored auth from AsyncStorage.
	 */
	protected async _loadStoredAuth(): Promise<Result<boolean, Error>> {
		try {
			const stored = await AsyncStorage.getItem(this.storageKey);
			if (!stored) {
				return ok(false);
			}

			const auth: TStoredAuth = JSON.parse(stored);
			this.deserializeFromStorage(auth);

			return ok(true);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Helper to wrap error handling in credential setters.
	 */
	protected wrapError(error: unknown): Error {
		return error instanceof Error ? error : new Error(String(error));
	}
}
