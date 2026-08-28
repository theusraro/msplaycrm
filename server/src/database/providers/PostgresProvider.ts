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

export class PostgresDatabaseProvider implements IDatabaseProvider {
  public name = 'PostgreSQL Production Provider';
  private connectionString: string;
  private client: any = null;

  constructor(connectionString?: string) {
    this.connectionString =
      connectionString ||
      process.env.DATABASE_URL ||
      `postgresql://${process.env.DB_USER || 'msplay'}:${process.env.DB_PASSWORD || 'msplay_secret'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'msplay_db'}`;
  }

  async init(): Promise<void> {
    try {
      // Dynamic import to prevent hard failure when dev environment doesn't have pg package installed
      // @ts-ignore
      const pg = await import('pg');
      const { Pool } = pg.default || pg;
      this.client = new Pool({ connectionString: this.connectionString });
      // Test query
      await this.client.query('SELECT 1');
      console.info('[PostgresDatabaseProvider] ✅ Conectado com sucesso ao PostgreSQL.');
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`FATAL: Falha ao conectar ao PostgreSQL de produção: ${err.message}`);
      }
      console.warn(`[PostgresDatabaseProvider] PostgreSQL indisponível (${err.message}). Utilizando DEV storage provider.`);
      throw err;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
    }
  }

  async getUsers(): Promise<UserEntity[]> {
    const res = await this.client.query('SELECT id, username, password_hash as "passwordHash", salt, status, expires_at as "expiresAt", max_devices as "maxDevices", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt" FROM users');
    return res.rows;
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    const res = await this.client.query('SELECT id, username, password_hash as "passwordHash", salt, status, expires_at as "expiresAt", max_devices as "maxDevices", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt" FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async getUserByUsername(username: string): Promise<UserEntity | null> {
    const res = await this.client.query('SELECT id, username, password_hash as "passwordHash", salt, status, expires_at as "expiresAt", max_devices as "maxDevices", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt" FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    return res.rows[0] || null;
  }

  async createUser(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const res = await this.client.query(
      'INSERT INTO users (id, username, password_hash, salt, status, expires_at, max_devices) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, password_hash as "passwordHash", salt, status, expires_at as "expiresAt", max_devices as "maxDevices", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt"',
      [id, user.username, user.passwordHash, user.salt, user.status, user.expiresAt, user.maxDevices]
    );
    return res.rows[0];
  }

  async updateUser(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.status) { sets.push(`status = $${idx++}`); values.push(updates.status); }
    if (updates.maxDevices) { sets.push(`max_devices = $${idx++}`); values.push(updates.maxDevices); }
    if (updates.expiresAt !== undefined) { sets.push(`expires_at = $${idx++}`); values.push(updates.expiresAt); }
    if (updates.passwordHash) { sets.push(`password_hash = $${idx++}`); values.push(updates.passwordHash); }
    if (updates.salt) { sets.push(`salt = $${idx++}`); values.push(updates.salt); }

    if (sets.length === 0) return this.getUserById(id);

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const res = await this.client.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, username, password_hash as "passwordHash", salt, status, expires_at as "expiresAt", max_devices as "maxDevices", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt"`,
      values
    );
    return res.rows[0] || null;
  }

  async getProfiles(userId?: string): Promise<ProfileEntity[]> {
    const query = userId
      ? 'SELECT id, user_id as "userId", name, avatar, color, EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt" FROM profiles WHERE user_id = $1'
      : 'SELECT id, user_id as "userId", name, avatar, color, EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt" FROM profiles';
    const res = await this.client.query(query, userId ? [userId] : []);
    return res.rows;
  }

  async createProfile(profile: Omit<ProfileEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProfileEntity> {
    const id = `prof_${Date.now()}`;
    const res = await this.client.query(
      'INSERT INTO profiles (id, user_id, name, avatar, color) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id as "userId", name, avatar, color, EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt"',
      [id, profile.userId, profile.name, profile.avatar || '', profile.color || '']
    );
    return res.rows[0];
  }

  async getDevices(): Promise<DeviceEntity[]> {
    const res = await this.client.query('SELECT id, user_id as "userId", device_uuid as "deviceUuid", device_name as "deviceName", device_type as "deviceType", platform, app_version as "appVersion", EXTRACT(EPOCH FROM last_seen)*1000 as "lastSeen", status, EXTRACT(EPOCH FROM created_at)*1000 as "createdAt" FROM devices');
    return res.rows;
  }

  async getDeviceByUuid(uuid: string): Promise<DeviceEntity | null> {
    const res = await this.client.query('SELECT id, user_id as "userId", device_uuid as "deviceUuid", device_name as "deviceName", device_type as "deviceType", platform, app_version as "appVersion", EXTRACT(EPOCH FROM last_seen)*1000 as "lastSeen", status, EXTRACT(EPOCH FROM created_at)*1000 as "createdAt" FROM devices WHERE device_uuid = $1', [uuid]);
    return res.rows[0] || null;
  }

  async registerOrUpdateDevice(info: {
    deviceUuid: string;
    userId?: string | null;
    deviceName?: string;
    deviceType: string;
    platform?: string;
    appVersion: string;
  }): Promise<DeviceEntity> {
    const existing = await this.getDeviceByUuid(info.deviceUuid);
    if (existing) {
      const res = await this.client.query(
        'UPDATE devices SET last_seen = CURRENT_TIMESTAMP, app_version = $1, user_id = COALESCE($2, user_id) WHERE device_uuid = $3 RETURNING id, user_id as "userId", device_uuid as "deviceUuid", device_name as "deviceName", device_type as "deviceType", platform, app_version as "appVersion", EXTRACT(EPOCH FROM last_seen)*1000 as "lastSeen", status, EXTRACT(EPOCH FROM created_at)*1000 as "createdAt"',
        [info.appVersion, info.userId || null, info.deviceUuid]
      );
      return res.rows[0];
    }
    const id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const res = await this.client.query(
      'INSERT INTO devices (id, user_id, device_uuid, device_name, device_type, platform, app_version) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, user_id as "userId", device_uuid as "deviceUuid", device_name as "deviceName", device_type as "deviceType", platform, app_version as "appVersion", EXTRACT(EPOCH FROM last_seen)*1000 as "lastSeen", status, EXTRACT(EPOCH FROM created_at)*1000 as "createdAt"',
      [id, info.userId || null, info.deviceUuid, info.deviceName || `Dispositivo ${info.deviceType.toUpperCase()}`, info.deviceType, info.platform || 'Web/Capacitor', info.appVersion]
    );
    return res.rows[0];
  }

  async updateDevice(id: string, updates: Partial<DeviceEntity>): Promise<DeviceEntity | null> {
    if (updates.status) {
      const res = await this.client.query(
        'UPDATE devices SET status = $1 WHERE id = $2 RETURNING id, user_id as "userId", device_uuid as "deviceUuid", device_name as "deviceName", device_type as "deviceType", platform, app_version as "appVersion", EXTRACT(EPOCH FROM last_seen)*1000 as "lastSeen", status, EXTRACT(EPOCH FROM created_at)*1000 as "createdAt"',
        [updates.status, id]
      );
      return res.rows[0] || null;
    }
    return null;
  }

  async getUserDeviceCount(userId: string): Promise<number> {
    const res = await this.client.query('SELECT COUNT(*) as count FROM devices WHERE user_id = $1 AND status = $2', [userId, 'active']);
    return parseInt(res.rows[0]?.count || '0', 10);
  }

  async createSession(session: Omit<SessionEntity, 'id' | 'createdAt'>): Promise<SessionEntity> {
    const id = `sess_${Date.now()}`;
    const res = await this.client.query(
      'INSERT INTO sessions (id, user_id, device_id, token_hash, expires_at) VALUES ($1, $2, $3, $4, TO_TIMESTAMP($5/1000)) RETURNING id, user_id as "userId", device_id as "deviceId", token_hash as "tokenHash", EXTRACT(EPOCH FROM expires_at)*1000 as "expiresAt", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt"',
      [id, session.userId, session.deviceId || null, session.tokenHash, session.expiresAt]
    );
    return res.rows[0];
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
    const res = await this.client.query(
      'SELECT id, user_id as "userId", device_id as "deviceId", token_hash as "tokenHash", EXTRACT(EPOCH FROM expires_at)*1000 as "expiresAt", EXTRACT(EPOCH FROM revoked_at)*1000 as "revokedAt", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt" FROM sessions WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP AND revoked_at IS NULL',
      [tokenHash]
    );
    return res.rows[0] || null;
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await this.client.query('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1', [tokenHash]);
  }

  async getAppConfig(): Promise<AppConfigEntity> {
    const res = await this.client.query('SELECT id, config_version as "configVersion", maintenance, features, minimum_app_version as "minimumAppVersion", latest_app_version as "latestAppVersion", default_source_group as "defaultSourceGroup", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt" FROM app_config WHERE id = $1', ['global']);
    return res.rows[0] || {
      id: 'global',
      configVersion: 1,
      maintenance: false,
      features: { tv: true, movies: true, series: true },
      minimumAppVersion: '2.0.0',
      latestAppVersion: '3.0.0',
      defaultSourceGroup: 'default',
      updatedAt: Date.now(),
    };
  }

  async updateAppConfig(updates: Partial<AppConfigEntity>): Promise<AppConfigEntity> {
    const current = await this.getAppConfig();
    const newVersion = (current.configVersion || 1) + 1;
    const maintenance = updates.maintenance !== undefined ? updates.maintenance : current.maintenance;
    const features = updates.features || current.features;

    const res = await this.client.query(
      'UPDATE app_config SET config_version = $1, maintenance = $2, features = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, config_version as "configVersion", maintenance, features, minimum_app_version as "minimumAppVersion", latest_app_version as "latestAppVersion", default_source_group as "defaultSourceGroup", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt"',
      [newVersion, maintenance, JSON.stringify(features), 'global']
    );
    return res.rows[0];
  }

  async getSources(): Promise<SourceEntity[]> {
    const res = await this.client.query('SELECT id, name, type, endpoint, priority, enabled, is_online as "isOnline", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt" FROM sources ORDER BY priority ASC');
    return res.rows;
  }

  async createSource(source: Omit<SourceEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<SourceEntity> {
    const id = `src_${Date.now()}`;
    const res = await this.client.query(
      'INSERT INTO sources (id, name, type, endpoint, priority, enabled, is_online) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, type, endpoint, priority, enabled, is_online as "isOnline", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt"',
      [id, source.name, source.type, source.endpoint, source.priority, source.enabled, source.isOnline]
    );
    return res.rows[0];
  }

  async updateSource(id: string, updates: Partial<SourceEntity>): Promise<SourceEntity | null> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name) { sets.push(`name = $${idx++}`); values.push(updates.name); }
    if (updates.priority !== undefined) { sets.push(`priority = $${idx++}`); values.push(updates.priority); }
    if (updates.enabled !== undefined) { sets.push(`enabled = $${idx++}`); values.push(updates.enabled); }
    if (updates.isOnline !== undefined) { sets.push(`is_online = $${idx++}`); values.push(updates.isOnline); }

    if (sets.length === 0) return null;
    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const res = await this.client.query(
      `UPDATE sources SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, name, type, endpoint, priority, enabled, is_online as "isOnline", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt", EXTRACT(EPOCH FROM updated_at)*1000 as "updatedAt"`,
      values
    );
    return res.rows[0] || null;
  }

  async getAuditLogs(): Promise<AuditLogEntity[]> {
    const res = await this.client.query('SELECT id, actor, action, target_type as "targetType", target_id as "targetId", before_state as "beforeState", after_state as "afterState", metadata, EXTRACT(EPOCH FROM created_at)*1000 as "timestamp" FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    return res.rows;
  }

  async logAudit(entry: Omit<AuditLogEntity, 'id' | 'timestamp'>): Promise<AuditLogEntity> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const res = await this.client.query(
      'INSERT INTO audit_logs (id, actor, action, target_type, target_id, before_state, after_state, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, actor, action, target_type as "targetType", target_id as "targetId", before_state as "beforeState", after_state as "afterState", metadata, EXTRACT(EPOCH FROM created_at)*1000 as "timestamp"',
      [id, entry.actor, entry.action, entry.targetType, entry.targetId, JSON.stringify(entry.beforeState || null), JSON.stringify(entry.afterState || null), JSON.stringify(entry.metadata || null)]
    );
    return res.rows[0];
  }
}
