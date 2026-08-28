import { ProfileRepository } from '../types/repositories';
import { UserProfile } from '../types/content';
import { envConfig } from '../config/env';
import { storage } from '../utils/storage';

const PROFILES_STORAGE_KEY = 'msply_profiles_v1';

const defaultProfiles: UserProfile[] = [
  { id: '1', name: 'Matheus', avatar: '', color: 'linear-gradient(135deg, #e50914, #8b0000)', createdAt: Date.now() },
  { id: '2', name: 'Sala', avatar: '', color: 'linear-gradient(135deg, #0078d4, #003366)', createdAt: Date.now() },
  { id: '3', name: 'Quarto', avatar: '', color: 'linear-gradient(135deg, #107c10, #004d00)', createdAt: Date.now() },
];

export class MockProfileRepository implements ProfileRepository {
  async getAll(): Promise<UserProfile[]> {
    const saved = storage.get<UserProfile[] | null>(PROFILES_STORAGE_KEY, null);
    if (!saved || saved.length === 0) {
      storage.set(PROFILES_STORAGE_KEY, defaultProfiles);
      return [...defaultProfiles];
    }
    return saved;
  }

  async create(profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    const profiles = await this.getAll();
    const newProfile: UserProfile = {
      ...profile,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    const updated = [...profiles, newProfile];
    storage.set(PROFILES_STORAGE_KEY, updated);
    return newProfile;
  }

  async update(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const profiles = await this.getAll();
    let updatedProfile: UserProfile | null = null;
    const updated = profiles.map(p => {
      if (p.id === id) {
        updatedProfile = { ...p, ...data };
        return updatedProfile;
      }
      return p;
    });
    storage.set(PROFILES_STORAGE_KEY, updated);
    return updatedProfile || profiles[0];
  }

  async delete(id: string): Promise<void> {
    const profiles = await this.getAll();
    const updated = profiles.filter(p => p.id !== id);
    storage.set(PROFILES_STORAGE_KEY, updated);
  }
}

export class RemoteProfileRepository implements ProfileRepository {
  private baseUrl: string;
  private mockFallback = new MockProfileRepository();

  constructor(baseUrl: string = envConfig.API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getAll(): Promise<UserProfile[]> {
    const token = storage.get<string | null>('msplay_auth_token', null);
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/profiles`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Fallback to local storage if remote request fails
    }
    return this.mockFallback.getAll();
  }

  async create(profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }
    return this.mockFallback.create(profile);
  }

  async update(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/profiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }
    return this.mockFallback.update(id, data);
  }

  async delete(id: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/profiles/${id}`, {
        method: 'DELETE',
      });
    } catch {
      // Fallback
    }
    await this.mockFallback.delete(id);
  }
}
