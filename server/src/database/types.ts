export interface UserEntity {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  iterations?: number;
  status: 'active' | 'suspended' | 'expired';
  expiresAt: string | null;
  maxDevices: number;
  configOverride?: {
    configVersion?: number;
    sourceGroup?: string;
    maintenance?: boolean;
    features?: Record<string, boolean>;
  };
  createdAt: number;
  updatedAt: number;
}

export interface ProfileEntity {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface DeviceEntity {
  id: string;
  userId: string | null;
  deviceUuid: string;
  deviceName: string;
  deviceType: string;
  platform: string;
  appVersion: string;
  lastSeen: number;
  status: 'active' | 'deactivated';
  configOverride?: {
    configVersion?: number;
    sourceGroup?: string;
    maintenance?: boolean;
    features?: Record<string, boolean>;
  };
  createdAt: number;
}

export interface SessionEntity {
  id: string;
  userId: string;
  deviceId?: string;
  tokenHash: string;
  expiresAt: number;
  revokedAt: number | null;
  createdAt: number;
}

export interface AppConfigEntity {
  id: string;
  configVersion: number;
  maintenance: boolean;
  features: {
    tv: boolean;
    movies: boolean;
    series: boolean;
  };
  minimumAppVersion: string;
  latestAppVersion: string;
  defaultSourceGroup: string;
  updatedAt: number;
}

export interface SourceEntity {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  priority: number;
  enabled: boolean;
  isOnline: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AuditLogEntity {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface IDatabaseProvider {
  name: string;
  init(): Promise<void>;
  close(): Promise<void>;
  
  // Users
  getUsers(): Promise<UserEntity[]>;
  getUserById(id: string): Promise<UserEntity | null>;
  getUserByUsername(username: string): Promise<UserEntity | null>;
  createUser(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity>;
  updateUser(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null>;

  // Profiles
  getProfiles(userId?: string): Promise<ProfileEntity[]>;
  createProfile(profile: Omit<ProfileEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProfileEntity>;

  // Devices
  getDevices(): Promise<DeviceEntity[]>;
  getDeviceByUuid(uuid: string): Promise<DeviceEntity | null>;
  registerOrUpdateDevice(info: {
    deviceUuid: string;
    userId?: string | null;
    deviceName?: string;
    deviceType: string;
    platform?: string;
    appVersion: string;
  }): Promise<DeviceEntity>;
  updateDevice(id: string, updates: Partial<DeviceEntity>): Promise<DeviceEntity | null>;
  getUserDeviceCount(userId: string): Promise<number>;

  // Sessions
  createSession(session: Omit<SessionEntity, 'id' | 'createdAt'>): Promise<SessionEntity>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionEntity | null>;
  revokeSession(tokenHash: string): Promise<void>;

  // Config
  getAppConfig(): Promise<AppConfigEntity>;
  updateAppConfig(updates: Partial<AppConfigEntity>): Promise<AppConfigEntity>;

  // Sources
  getSources(): Promise<SourceEntity[]>;
  createSource(source: Omit<SourceEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<SourceEntity>;
  updateSource(id: string, updates: Partial<SourceEntity>): Promise<SourceEntity | null>;

  // Audit Logs
  getAuditLogs(): Promise<AuditLogEntity[]>;
  logAudit(entry: Omit<AuditLogEntity, 'id' | 'timestamp'>): Promise<AuditLogEntity>;
}
