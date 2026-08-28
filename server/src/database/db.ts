import { IDatabaseProvider } from './types.js';
import { JsonDevDatabaseProvider } from './providers/JsonDevProvider.js';
import { PostgresDatabaseProvider } from './providers/PostgresProvider.js';

export * from './types.js';

export class Database {
  private provider: IDatabaseProvider;
  private isConnected = false;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const providerType = process.env.DB_PROVIDER || (process.env.DATABASE_URL ? 'postgres' : 'json');

    if (isProduction && providerType !== 'postgres') {
      throw new Error(
        'FATAL: Em produção (NODE_ENV=production), o banco de dados PostgreSQL é OBRIGATÓRIO (DB_PROVIDER=postgres). DEV Storage não é permitido em produção.'
      );
    }

    if (providerType === 'postgres') {
      this.provider = new PostgresDatabaseProvider();
    } else {
      this.provider = new JsonDevDatabaseProvider();
    }
  }

  async init(): Promise<void> {
    try {
      await this.provider.init();
      this.isConnected = true;
      console.info(`[Database Engine] 📦 Provedor ativo: ${this.provider.name}`);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production' && this.provider instanceof PostgresDatabaseProvider) {
        console.warn(`[Database Engine] ⚠️ Falha ao conectar ao PostgreSQL (${err.message}). Alternando automaticamente para DEV Storage.`);
        this.provider = new JsonDevDatabaseProvider();
        await this.provider.init();
        this.isConnected = true;
      } else {
        this.isConnected = false;
        throw err;
      }
    }
  }

  async close(): Promise<void> {
    this.isConnected = false;
    await this.provider.close();
  }

  getProviderName(): string {
    return this.provider.name;
  }

  getProviderType(): 'postgres' | 'json_dev' {
    return this.provider instanceof PostgresDatabaseProvider ? 'postgres' : 'json_dev';
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // Users
  getUsers() { return this.provider.getUsers(); }
  getUserById(id: string) { return this.provider.getUserById(id); }
  getUserByUsername(username: string) { return this.provider.getUserByUsername(username); }
  createUser(user: Parameters<IDatabaseProvider['createUser']>[0]) { return this.provider.createUser(user); }
  updateUser(id: string, updates: Parameters<IDatabaseProvider['updateUser']>[1]) { return this.provider.updateUser(id, updates); }

  // Profiles
  getProfiles(userId?: string) { return this.provider.getProfiles(userId); }
  createProfile(profile: Parameters<IDatabaseProvider['createProfile']>[0]) { return this.provider.createProfile(profile); }

  // Devices
  getDevices() { return this.provider.getDevices(); }
  getDeviceByUuid(uuid: string) { return this.provider.getDeviceByUuid(uuid); }
  registerOrUpdateDevice(info: Parameters<IDatabaseProvider['registerOrUpdateDevice']>[0]) { return this.provider.registerOrUpdateDevice(info); }
  updateDevice(id: string, updates: Parameters<IDatabaseProvider['updateDevice']>[1]) { return this.provider.updateDevice(id, updates); }
  getUserDeviceCount(userId: string) { return this.provider.getUserDeviceCount(userId); }

  // Sessions
  createSession(session: Parameters<IDatabaseProvider['createSession']>[0]) { return this.provider.createSession(session); }
  findSessionByTokenHash(tokenHash: string) { return this.provider.findSessionByTokenHash(tokenHash); }
  revokeSession(tokenHash: string) { return this.provider.revokeSession(tokenHash); }

  // Config
  getAppConfig() { return this.provider.getAppConfig(); }
  updateAppConfig(updates: Parameters<IDatabaseProvider['updateAppConfig']>[0]) { return this.provider.updateAppConfig(updates); }

  // Sources
  getSources() { return this.provider.getSources(); }
  createSource(source: Parameters<IDatabaseProvider['createSource']>[0]) { return this.provider.createSource(source); }
  updateSource(id: string, updates: Parameters<IDatabaseProvider['updateSource']>[1]) { return this.provider.updateSource(id, updates); }

  // Audit
  getAuditLogs() { return this.provider.getAuditLogs(); }
  logAudit(entry: Parameters<IDatabaseProvider['logAudit']>[0]) { return this.provider.logAudit(entry); }
}

export const db = new Database();
