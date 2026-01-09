import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageRepository } from '../../domain/repositories/storage-repository';
import { ok, err, type Result } from '../../shared/types/result';

/**
 * Key prefix for all Aria storage entries
 */
const ARIA_PREFIX = '@aria:';

/**
 * AsyncStorageRepository implementation using React Native AsyncStorage.
 * All keys are prefixed with '@aria:' to avoid conflicts with other apps.
 */
class AsyncStorageRepository implements StorageRepository {
  /**
   * Add the Aria prefix to a key
   */
  private prefixKey(key: string): string {
    return `${ARIA_PREFIX}${key}`;
  }

  /**
   * Remove the Aria prefix from a key
   */
  private unprefixKey(key: string): string {
    return key.startsWith(ARIA_PREFIX) ? key.slice(ARIA_PREFIX.length) : key;
  }

  /**
   * Get a value by key
   */
  async get<T>(key: string): Promise<Result<T | null, Error>> {
    try {
      const prefixedKey = this.prefixKey(key);
      const value = await AsyncStorage.getItem(prefixedKey);

      if (value === null) {
        return ok(null);
      }

      try {
        const parsed = JSON.parse(value) as T;
        return ok(parsed);
      } catch (parseError) {
        return err(
          new Error(
            `Failed to parse stored value for key "${key}": ${parseError instanceof Error ? parseError.message : String(parseError)}`
          )
        );
      }
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error(`Failed to get key "${key}": ${String(error)}`)
      );
    }
  }

  /**
   * Set a value by key
   */
  async set<T>(key: string, value: T): Promise<Result<void, Error>> {
    try {
      const prefixedKey = this.prefixKey(key);
      const serialized = JSON.stringify(value);
      await AsyncStorage.setItem(prefixedKey, serialized);
      return ok(undefined);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to set key "${key}": ${String(error)}`)
      );
    }
  }

  /**
   * Remove a value by key
   */
  async remove(key: string): Promise<Result<void, Error>> {
    try {
      const prefixedKey = this.prefixKey(key);
      await AsyncStorage.removeItem(prefixedKey);
      return ok(undefined);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to remove key "${key}": ${String(error)}`)
      );
    }
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<Result<boolean, Error>> {
    try {
      const prefixedKey = this.prefixKey(key);
      const value = await AsyncStorage.getItem(prefixedKey);
      return ok(value !== null);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to check key "${key}": ${String(error)}`)
      );
    }
  }

  /**
   * Get multiple values by keys
   */
  async getMany<T>(keys: string[]): Promise<Result<Map<string, T>, Error>> {
    try {
      const prefixedKeys = keys.map(k => this.prefixKey(k));
      const pairs = await AsyncStorage.multiGet(prefixedKeys);

      const resultMap = new Map<string, T>();
      const errors: string[] = [];

      for (let i = 0; i < pairs.length; i++) {
        const [prefixedKey, value] = pairs[i];
        const originalKey = keys[i];

        if (value !== null) {
          try {
            const parsed = JSON.parse(value) as T;
            resultMap.set(originalKey, parsed);
          } catch (parseError) {
            errors.push(
              `Failed to parse value for key "${originalKey}": ${parseError instanceof Error ? parseError.message : String(parseError)}`
            );
          }
        }
      }

      if (errors.length > 0) {
        return err(new Error(`Errors during getMany: ${errors.join('; ')}`));
      }

      return ok(resultMap);
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error(`Failed to get multiple keys: ${String(error)}`)
      );
    }
  }

  /**
   * Set multiple values
   */
  async setMany<T>(entries: Map<string, T>): Promise<Result<void, Error>> {
    try {
      const pairs: [string, string][] = [];

      for (const [key, value] of entries.entries()) {
        const prefixedKey = this.prefixKey(key);
        const serialized = JSON.stringify(value);
        pairs.push([prefixedKey, serialized]);
      }

      await AsyncStorage.multiSet(pairs);
      return ok(undefined);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to set multiple keys: ${String(error)}`)
      );
    }
  }

  /**
   * Remove multiple values by keys
   */
  async removeMany(keys: string[]): Promise<Result<void, Error>> {
    try {
      const prefixedKeys = keys.map(k => this.prefixKey(k));
      await AsyncStorage.multiRemove(prefixedKeys);
      return ok(undefined);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to remove multiple keys: ${String(error)}`)
      );
    }
  }

  /**
   * Get all keys matching a prefix
   */
  async getKeys(prefix?: string): Promise<Result<string[], Error>> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();

      // Filter for Aria keys and remove our prefix
      let ariaKeys = allKeys
        .filter(key => key.startsWith(ARIA_PREFIX))
        .map(key => this.unprefixKey(key));

      // Apply additional prefix filter if provided
      if (prefix !== undefined) {
        ariaKeys = ariaKeys.filter(key => key.startsWith(prefix));
      }

      return ok(ariaKeys);
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error(`Failed to get keys: ${String(error)}`)
      );
    }
  }

  /**
   * Clear all stored data (only keys with @aria: prefix)
   */
  async clear(): Promise<Result<void, Error>> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const ariaKeys = allKeys.filter(key => key.startsWith(ARIA_PREFIX));

      if (ariaKeys.length > 0) {
        await AsyncStorage.multiRemove(ariaKeys);
      }

      return ok(undefined);
    } catch (error) {
      return err(
        error instanceof Error ? error : new Error(`Failed to clear storage: ${String(error)}`)
      );
    }
  }
}

/**
 * Singleton instance of AsyncStorageRepository
 */
export const asyncStorageRepository = new AsyncStorageRepository();

/**
 * Export the class for testing purposes
 */
export { AsyncStorageRepository };
