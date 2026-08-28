import fs from 'node:fs';
import path from 'node:path';
import {
  IDatabaseProvider,
  UserEntity,
  ProfileEntity,
  DeviceEntity,
  SessionEntity,
  AppConfigEntity,
  SourceEntity,
  AuditLogEntity
} from '../types.js';
import { hashPassword } from '../../auth/crypto.js';

interface JsonStoreData {
  users: UserEntity[];
  profiles: ProfileEntity[];
  devices: DeviceEntity[];
  sessions: SessionEntity[];
  appConfig: AppConfigEntity;
  sources: SourceEntity[];
  auditLogs: AuditLogEntity[];
}

export class JsonDevDatabaseProvider implements IDatabaseProvider {
  public name = 'JsonDevStorage (DEV ONLY)';
  private data: JsonStoreData;
  private filePath: string;

  constructor(storageDir?: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: JsonDevDatabaseProvider é restrito exclusivamente a desenvolvimento local. Em produção (NODE_ENV=production), configure PostgreSQL (DB_PROVIDER=postgres).'
      );
    }

    const dir = storageDir || path.resolve(process.cwd(), 'server', 'data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // Fallback
      }
    }
    this.filePath = path.join(dir, 'msplay_dev_storage.json');
    this.data = this.load();
  }

  async init(): Promise<void> {
    // Initialized in constructor
  }

  async close(): Promise<void> {
    this.save();
  }

  private load(): JsonStoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed: JsonStoreData = JSON.parse(raw);
        const seed = this.getInitialSeed();
        
        // Ensure standard dev users exist
        for (const seedUser of seed.users) {
          if (!parsed.users.some(u => u.username.toLowerCase() === seedUser.username.toLowerCase())) {
            parsed.users.push(seedUser);
          }
        }
        // Ensure standard profiles exist
        for (const seedProfile of seed.profiles) {
          if (!parsed.profiles.some(p => p.id === seedProfile.id)) {
            parsed.profiles.push(seedProfile);
          }
        }
        return parsed;
      }
    } catch {
      // Use initial seed
    }
    return this.getInitialSeed();
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // Memory fallback
    }
  }

  private getInitialSeed(): JsonStoreData {
    const devUserHash = hashPassword('1234');
    const joaoHash = hashPassword('1234');
    const mariaHash = hashPassword('5678');
    const isDev = process.env.NODE_ENV !== 'production';

    const users: UserEntity[] = [
      {
        id: 'user_dev_01',
        username: 'teste',
        passwordHash: devUserHash.hash,
        salt: devUserHash.salt,
        iterations: devUserHash.iterations,
        status: 'active',
        expiresAt: null,
        maxDevices: 3,
        configOverride: {
          sourceGroup: 'default',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'user_joao_01',
        username: 'joao',
        passwordHash: joaoHash.hash,
        salt: joaoHash.salt,
        iterations: joaoHash.iterations,
        status: 'active',
        expiresAt: null,
        maxDevices: 3,
        configOverride: {
          sourceGroup: 'default',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'user_maria_01',
        username: 'maria',
        passwordHash: mariaHash.hash,
        salt: mariaHash.salt,
        iterations: mariaHash.iterations,
        status: 'active',
        expiresAt: null,
        maxDevices: 3,
        configOverride: {
          sourceGroup: 'backup-test',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    ];

    // Only add default admin if strictly in DEV
    if (isDev) {
      const adminHash = hashPassword('admin123');
      users.push({
        id: 'user_admin_01',
        username: 'admin',
        passwordHash: adminHash.hash,
        salt: adminHash.salt,
        iterations: adminHash.iterations,
        status: 'active',
        expiresAt: null,
        maxDevices: 10,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return {
      users,
      profiles: [
        { id: 'prof-01', userId: 'user_dev_01', name: 'Matheus', avatar: '', color: 'linear-gradient(135deg, #e50914, #8b0000)', createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'prof-02', userId: 'user_dev_01', name: 'Sala', avatar: '', color: 'linear-gradient(135deg, #0078d4, #003366)', createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'prof-03', userId: 'user_dev_01', name: 'Quarto', avatar: '', color: 'linear-gradient(135deg, #107c10, #004d00)', createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'prof-joao-01', userId: 'user_joao_01', name: 'João', avatar: '', color: 'linear-gradient(135deg, #0078d4, #003366)', createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'prof-maria-01', userId: 'user_maria_01', name: 'Maria', avatar: '', color: 'linear-gradient(135deg, #8a2be2, #4b0082)', createdAt: Date.now(), updatedAt: Date.now() },
      ],
      devices: [
        {
          id: 'dev_mock_01',
          userId: 'user_dev_01',
          deviceUuid: 'device-mock-tv-sala',
          deviceName: 'Smart TV Sala',
          deviceType: 'android_tv',
          platform: 'AndroidTV',
          appVersion: '3.0.0',
          lastSeen: Date.now(),
          status: 'active',
          createdAt: Date.now(),
        }
      ],
      sessions: [],
      appConfig: {
        id: 'global',
        configVersion: 1,
        maintenance: false,
        features: {
          tv: true,
          movies: true,
          series: true,
        },
        minimumAppVersion: '2.0.0',
        latestAppVersion: '3.0.0',
        defaultSourceGroup: 'default',
        updatedAt: Date.now(),
      },
      sources: [
        { id: 'src-01', name: 'Principal Mock (Cluster Alpha)', type: 'mock_catalog', endpoint: 'mock://cluster-alpha.msplay.internal/v1', priority: 1, enabled: true, isOnline: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'src-02', name: 'Backup Mock 1 (Cluster Beta)', type: 'mock_catalog', endpoint: 'mock://cluster-beta.msplay.internal/v1', priority: 2, enabled: true, isOnline: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'src-03', name: 'Backup Mock 2 (Edge Gamma)', type: 'mock_catalog', endpoint: 'mock://edge-gamma.msplay.internal/v1', priority: 3, enabled: true, isOnline: true, createdAt: Date.now(), updatedAt: Date.now() }
      ],
      auditLogs: [
        { id: 'log-01', actor: 'SYSTEM', action: 'DEV_STORAGE_INITIALIZED', targetType: 'system', targetId: 'global', timestamp: Date.now() }
      ]
    };
  }

  // Users
  async getUsers(): Promise<UserEntity[]> { return [...this.data.users]; }
  async getUserById(id: string): Promise<UserEntity | null> { return this.data.users.find(u => u.id === id) || null; }
  async getUserByUsername(username: string): Promise<UserEntity | null> {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }
  async createUser(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity> {
    const newUser: UserEntity = {
      ...user,
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }
  async updateUser(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null> {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: Date.now() };
    this.save();
    return this.data.users[idx];
  }

  // Profiles
  async getProfiles(userId?: string): Promise<ProfileEntity[]> {
    if (userId) return this.data.profiles.filter(p => p.userId === userId);
    return [...this.data.profiles];
  }
  async createProfile(profile: Omit<ProfileEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProfileEntity> {
    const newProfile: ProfileEntity = {
      ...profile,
      id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.profiles.push(newProfile);
    this.save();
    return newProfile;
  }

  // Devices
  async getDevices(): Promise<DeviceEntity[]> { return [...this.data.devices]; }
  async getDeviceByUuid(uuid: string): Promise<DeviceEntity | null> {
    return this.data.devices.find(d => d.deviceUuid === uuid) || null;
  }
  async registerOrUpdateDevice(info: {
    deviceUuid: string;
    userId?: string | null;
    deviceName?: string;
    deviceType: string;
    platform?: string;
    appVersion: string;
  }): Promise<DeviceEntity> {
    let device = this.data.devices.find(d => d.deviceUuid === info.deviceUuid);
    const now = Date.now();
    if (device) {
      device.lastSeen = now;
      device.appVersion = info.appVersion || device.appVersion;
      if (info.userId) device.userId = info.userId;
    } else {
      device = {
        id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: info.userId || null,
        deviceUuid: info.deviceUuid,
        deviceName: info.deviceName || `Dispositivo ${info.deviceType.toUpperCase()}`,
        deviceType: info.deviceType,
        platform: info.platform || 'Web/Capacitor',
        appVersion: info.appVersion,
        lastSeen: now,
        status: 'active',
        createdAt: now,
      };
      this.data.devices.push(device);
    }
    this.save();
    return device;
  }
  async updateDevice(id: string, updates: Partial<DeviceEntity>): Promise<DeviceEntity | null> {
    const idx = this.data.devices.findIndex(d => d.id === id);
    if (idx === -1) return null;
    this.data.devices[idx] = { ...this.data.devices[idx], ...updates };
    this.save();
    return this.data.devices[idx];
  }
  async getUserDeviceCount(userId: string): Promise<number> {
    return this.data.devices.filter(d => d.userId === userId && d.status === 'active').length;
  }

  // Sessions
  async createSession(session: Omit<SessionEntity, 'id' | 'createdAt'>): Promise<SessionEntity> {
    const newSession: SessionEntity = {
      ...session,
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };
    this.data.sessions.push(newSession);
    this.save();
    return newSession;
  }
  async findSessionByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
    const now = Date.now();
    const session = this.data.sessions.find(s => s.tokenHash === tokenHash && s.expiresAt > now && !s.revokedAt);
    return session || null;
  }
  async revokeSession(tokenHash: string): Promise<void> {
    const session = this.data.sessions.find(s => s.tokenHash === tokenHash);
    if (session) {
      session.revokedAt = Date.now();
      this.save();
    }
  }

  // Config
  async getAppConfig(): Promise<AppConfigEntity> { return { ...this.data.appConfig }; }
  async updateAppConfig(updates: Partial<AppConfigEntity>): Promise<AppConfigEntity> {
    this.data.appConfig = {
      ...this.data.appConfig,
      ...updates,
      configVersion: (this.data.appConfig.configVersion || 1) + 1,
      updatedAt: Date.now(),
    };
    this.save();
    return { ...this.data.appConfig };
  }

  // Sources
  async getSources(): Promise<SourceEntity[]> { return [...this.data.sources]; }
  async createSource(source: Omit<SourceEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<SourceEntity> {
    const newSource: SourceEntity = {
      ...source,
      id: `src_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.sources.push(newSource);
    this.save();
    return newSource;
  }
  async updateSource(id: string, updates: Partial<SourceEntity>): Promise<SourceEntity | null> {
    const idx = this.data.sources.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.data.sources[idx] = { ...this.data.sources[idx], ...updates, updatedAt: Date.now() };
    this.save();
    return this.data.sources[idx];
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogEntity[]> {
    return [...this.data.auditLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
  }
  async logAudit(entry: Omit<AuditLogEntity, 'id' | 'timestamp'>): Promise<AuditLogEntity> {
    const log: AuditLogEntity = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    this.data.auditLogs.push(log);
    this.save();
    return log;
  }
}
