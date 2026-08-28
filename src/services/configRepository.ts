import { ConfigRepository } from '../types/repositories';
import { envConfig } from '../config/env';
import { getDeviceId } from '../utils/deviceId';
import { storage } from '../utils/storage';

const CACHED_CONFIG_KEY = 'msplay_remote_config_v1';

export interface RemoteAppConfig {
  configVersion: number;
  maintenance: boolean;
  features: {
    tv: boolean;
    movies: boolean;
    series: boolean;
  };
  sourceGroup: string;
  minimumAppVersion?: string;
  latestAppVersion?: string;
  customMessage?: string;
  updatedAt?: number;
}

export const defaultAppConfig: RemoteAppConfig = {
  configVersion: 1,
  maintenance: false,
  features: {
    tv: true,
    movies: true,
    series: true,
  },
  sourceGroup: 'default',
  minimumAppVersion: '2.0.0',
  latestAppVersion: '3.0.0',
  updatedAt: Date.now(),
};

export class MockConfigRepository implements ConfigRepository {
  async getSettings(): Promise<Record<string, unknown>> {
    return { ...defaultAppConfig };
  }

  async saveSetting(key: string, value: unknown): Promise<void> {
    storage.set(`msplay_setting_${key}`, value);
  }

  async getRemoteConfig(): Promise<RemoteAppConfig> {
    const cached = storage.get<RemoteAppConfig | null>(CACHED_CONFIG_KEY, null);
    return cached || { ...defaultAppConfig };
  }
}

export class RemoteConfigRepository implements ConfigRepository {
  private baseUrl: string;

  constructor(baseUrl: string = envConfig.API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getSettings(): Promise<Record<string, unknown>> {
    const config = await this.getRemoteConfig();
    return config as unknown as Record<string, unknown>;
  }

  async saveSetting(key: string, value: unknown): Promise<void> {
    storage.set(`msplay_setting_${key}`, value);
  }

  /**
   * Fetches latest remote config with cache fallback.
   * Compares configVersion and safely stores new versions.
   */
  async getRemoteConfig(): Promise<RemoteAppConfig> {
    const deviceId = getDeviceId();
    const cachedConfig = storage.get<RemoteAppConfig | null>(CACHED_CONFIG_KEY, defaultAppConfig);

    const token = storage.get<string | null>('msplay_auth_token', null);
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/device/config?deviceId=${encodeURIComponent(deviceId)}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.warn(`[RemoteConfigRepository] Server returned status ${response.status}, using cached configuration.`);
        return cachedConfig || defaultAppConfig;
      }

      const serverConfig: RemoteAppConfig = await response.json();

      // Check if server configuration is valid
      if (serverConfig && typeof serverConfig.configVersion === 'number') {
        // If configVersion changed or cache is empty, update local cache
        if (!cachedConfig || serverConfig.configVersion !== cachedConfig.configVersion) {
          console.info(`[RemoteConfigRepository] Updated configVersion from ${cachedConfig?.configVersion || 0} to ${serverConfig.configVersion}`);
        }
        storage.set(CACHED_CONFIG_KEY, serverConfig);
        return serverConfig;
      }

      return cachedConfig || defaultAppConfig;
    } catch (error) {
      console.warn('[RemoteConfigRepository] Network error fetching remote config. Using cached version.', error);
      return cachedConfig || defaultAppConfig;
    }
  }
}
