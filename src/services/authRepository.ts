import { AuthRepository } from '../types/repositories';
import { envConfig } from '../config/env';
import { getDeviceId, getDeviceInfo } from '../utils/deviceId';
import { storage } from '../utils/storage';

const AUTH_TOKEN_KEY = 'msplay_auth_token';
const AUTH_USER_KEY = 'msplay_auth_user';

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    username: string;
    status: string;
    expiresAt?: string;
  };
  error?: string;
}

export class MockAuthRepository implements AuthRepository {
  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const cleanUsername = username.trim().toLowerCase();
    // Simulate short network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (cleanUsername === 'teste' && password === '1234') {
      storage.set('msplay_auth_v1', { authenticated: true });
      return { success: true };
    }
    return { success: false, error: 'Usuário ou senha inválidos.' };
  }

  async logout(): Promise<void> {
    storage.remove('msplay_auth_v1');
  }

  isAuthenticated(): boolean {
    const data = storage.get<{ authenticated: boolean } | null>('msplay_auth_v1', null);
    return !!data?.authenticated;
  }
}

export class RemoteAuthRepository implements AuthRepository {
  private baseUrl: string;

  constructor(baseUrl: string = envConfig.API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const cleanUsername = username.trim();
    const deviceInfo = getDeviceInfo();

    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password,
          deviceId: getDeviceId(),
          deviceType: deviceInfo.deviceType,
          appVersion: deviceInfo.appVersion,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Falha ao autenticar no servidor.',
        };
      }

      // Save session token securely (never save plain password)
      if (data.token) {
        storage.set(AUTH_TOKEN_KEY, data.token);
      }
      if (data.user) {
        storage.set(AUTH_USER_KEY, data.user);
      }
      storage.set('msplay_auth_v1', { authenticated: true });

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: 'Servidor indisponível no momento. Verifique sua conexão.',
      };
    }
  }

  async logout(): Promise<void> {
    const token = storage.get<string | null>(AUTH_TOKEN_KEY, null);
    try {
      if (token) {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      storage.remove(AUTH_TOKEN_KEY);
      storage.remove(AUTH_USER_KEY);
      storage.remove('msplay_auth_v1');
    }
  }

  isAuthenticated(): boolean {
    const token = storage.get<string | null>(AUTH_TOKEN_KEY, null);
    const mockAuth = storage.get<{ authenticated: boolean } | null>('msplay_auth_v1', null);
    return !!token || !!mockAuth?.authenticated;
  }
}
