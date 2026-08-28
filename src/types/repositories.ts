import type { ContentItem, UserProfile, DeviceConfig } from './content';

export interface AuthRepository {
  login(username: string, password: string): Promise<{ success: boolean; error?: string }>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
}

export interface ContentRepository {
  getAll(): Promise<ContentItem[]>;
  getById(id: string): Promise<ContentItem | null>;
  getByType(type: string): Promise<ContentItem[]>;
  search(query: string): Promise<ContentItem[]>;
}

export interface ProfileRepository {
  getAll(): Promise<UserProfile[]>;
  create(profile: Omit<UserProfile, 'id'>): Promise<UserProfile>;
  update(id: string, data: Partial<UserProfile>): Promise<UserProfile>;
  delete(id: string): Promise<void>;
}

export interface ConfigRepository {
  getSettings(): Promise<Record<string, unknown>>;
  saveSetting(key: string, value: unknown): Promise<void>;
}

export interface DeviceRepository {
  getDeviceConfig(): Promise<DeviceConfig>;
  getDeviceId(): string;
}
