import { DeviceRepository } from '../types/repositories';
import { DeviceConfig } from '../types/content';
import { envConfig } from '../config/env';
import { getDeviceId, getDeviceInfo } from '../utils/deviceId';

export class MockDeviceRepository implements DeviceRepository {
  getDeviceId(): string {
    return getDeviceId();
  }

  async getDeviceConfig(): Promise<DeviceConfig> {
    const info = getDeviceInfo();
    return {
      deviceId: info.deviceId,
      deviceType: info.deviceType as any,
      appVersion: info.appVersion,
      configVersion: 1,
      activePlaylistId: 'mock-default-source',
      fallbackPlaylistIds: ['mock-backup-1', 'mock-backup-2'],
    };
  }

  async sendHeartbeat(): Promise<{ success: boolean; lastSeen: number }> {
    return { success: true, lastSeen: Date.now() };
  }
}

export class RemoteDeviceRepository implements DeviceRepository {
  private baseUrl: string;
  private lastHeartbeatTime: number = 0;

  constructor(baseUrl: string = envConfig.API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  getDeviceId(): string {
    return getDeviceId();
  }

  async getDeviceConfig(): Promise<DeviceConfig> {
    const info = getDeviceInfo();
    try {
      const response = await fetch(`${this.baseUrl}/device/config?deviceId=${encodeURIComponent(info.deviceId)}`);
      if (response.ok) {
        const data = await response.json();
        return {
          deviceId: info.deviceId,
          deviceType: info.deviceType as any,
          appVersion: info.appVersion,
          configVersion: data.configVersion || 1,
          activePlaylistId: data.sourceGroup || 'default',
        };
      }
    } catch {
      // Fallback
    }

    return {
      deviceId: info.deviceId,
      deviceType: info.deviceType as any,
      appVersion: info.appVersion,
      configVersion: 1,
    };
  }

  /**
   * Sends heartbeat with rate throttling (max once every 30 seconds)
   */
  async sendHeartbeat(): Promise<{ success: boolean; lastSeen?: number }> {
    const now = Date.now();
    // Throttle heartbeat to avoid excess requests
    if (now - this.lastHeartbeatTime < 30000) {
      return { success: true, lastSeen: this.lastHeartbeatTime };
    }

    const info = getDeviceInfo();

    try {
      const response = await fetch(`${this.baseUrl}/device/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: info.deviceId,
          deviceType: info.deviceType,
          appVersion: info.appVersion,
          platform: info.platform,
        }),
      });

      if (response.ok) {
        this.lastHeartbeatTime = now;
        const data = await response.json();
        return { success: true, lastSeen: data.lastSeen || now };
      }
    } catch (err) {
      console.warn('[RemoteDeviceRepository] Heartbeat network fail (non-blocking)');
    }

    return { success: false };
  }
}
