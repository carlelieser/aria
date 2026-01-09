/**
 * YouTube Music Innertube client management
 */

import Innertube from 'youtubei.js/react-native';
import type { YouTubeMusicConfig } from './config';

/**
 * Client manager interface
 */
export interface ClientManager {
  getClient(): Promise<Innertube>;
  createFreshClient(): Promise<Innertube>;
  destroy(): void;
  isInitialized(): boolean;
}

/**
 * Create a client manager for Innertube instances
 */
export function createClientManager(config: YouTubeMusicConfig): ClientManager {
  let client: Innertube | null = null;
  let initPromise: Promise<Innertube> | null = null;

  async function createClient(): Promise<Innertube> {
    return Innertube.create({
      lang: config.lang,
      location: config.location,
    });
  }

  return {
    async getClient(): Promise<Innertube> {
      if (client) return client;

      if (initPromise) return initPromise;

      initPromise = createClient();

      try {
        client = await initPromise;
        return client;
      } catch (error) {
        initPromise = null;
        throw error;
      }
    },

    async createFreshClient(): Promise<Innertube> {
      return createClient();
    },

    destroy(): void {
      client = null;
      initPromise = null;
    },

    isInitialized(): boolean {
      return client !== null;
    },
  };
}
