/**
 * MSPLAY Source Management & Failover Engine
 * Modularized into:
 * - SourceResolver (resolves content from selected endpoint)
 * - HealthChecker (monitors cluster/source status with cache)
 * - FailoverManager (orchestrates priority-based fallback logic)
 */

export interface Source {
  id: string;
  name: string;
  type: 'mock_catalog' | 'mock_epg' | 'mock_stream';
  endpoint: string;
  priority: number; // 1 = highest, 2 = fallback, 3 = secondary fallback
  enabled: boolean;
  isOnline: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SourceGroup {
  id: string;
  name: string;
  description: string;
  sources: Source[];
}

export const defaultMockSources: Source[] = [
  {
    id: 'src-01',
    name: 'Principal Mock (Cluster Alpha)',
    type: 'mock_catalog',
    endpoint: 'mock://cluster-alpha.msplay.internal/v1',
    priority: 1,
    enabled: true,
    isOnline: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'src-02',
    name: 'Backup Mock 1 (Cluster Beta)',
    type: 'mock_catalog',
    endpoint: 'mock://cluster-beta.msplay.internal/v1',
    priority: 2,
    enabled: true,
    isOnline: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'src-03',
    name: 'Backup Mock 2 (Edge Cache Gamma)',
    type: 'mock_catalog',
    endpoint: 'mock://edge-gamma.msplay.internal/v1',
    priority: 3,
    enabled: true,
    isOnline: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

export const defaultSourceGroup: SourceGroup = {
  id: 'default',
  name: 'Grupo Padrão MSPLAY',
  description: 'Grupo principal de entrega com failover automático em 3 camadas',
  sources: defaultMockSources,
};

/**
 * HealthChecker: Monitors sources with TTL caching to avoid excess health pings.
 */
export class HealthChecker {
  private healthCache = new Map<string, { isOnline: boolean; checkedAt: number }>();
  private cacheTtlMs: number;

  constructor(cacheTtlMs = 15000) {
    this.cacheTtlMs = cacheTtlMs;
  }

  async checkHealth(source: Source): Promise<boolean> {
    const cached = this.healthCache.get(source.id);
    const now = Date.now();

    if (cached && now - cached.checkedAt < this.cacheTtlMs) {
      return cached.isOnline;
    }

    // In mock phase, respect source.isOnline flag
    const isHealthy = source.enabled && source.isOnline !== false;
    this.healthCache.set(source.id, { isOnline: isHealthy, checkedAt: now });
    return isHealthy;
  }

  invalidateCache(sourceId?: string): void {
    if (sourceId) {
      this.healthCache.delete(sourceId);
    } else {
      this.healthCache.clear();
    }
  }
}

/**
 * SourceResolver: Resolves specific payload from a target source.
 */
export class SourceResolver {
  private timeoutMs: number;

  constructor(timeoutMs = 1500) {
    this.timeoutMs = timeoutMs;
  }

  async resolve<T>(source: Source, fetchFn: (source: Source) => Promise<T>): Promise<T> {
    return Promise.race([
      fetchFn(source),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout ao conectar à fonte ${source.name}`)), this.timeoutMs)
      )
    ]);
  }
}

/**
 * FailoverManager: Orchestrates priority fallback (Priority 1 -> 2 -> 3).
 */
export class FailoverManager {
  private group: SourceGroup;
  private healthChecker: HealthChecker;
  private resolver: SourceResolver;

  constructor(
    initialGroup: SourceGroup = defaultSourceGroup,
    healthChecker = new HealthChecker(),
    resolver = new SourceResolver()
  ) {
    this.group = initialGroup;
    this.healthChecker = healthChecker;
    this.resolver = resolver;
  }

  getGroup(): SourceGroup {
    return this.group;
  }

  setSourceStatus(sourceId: string, isOnline: boolean): void {
    this.group.sources = this.group.sources.map(s =>
      s.id === sourceId ? { ...s, isOnline, updatedAt: Date.now() } : s
    );
    this.healthChecker.invalidateCache(sourceId);
  }

  async executeWithFailover<T>(
    fetchFn: (source: Source) => Promise<T>
  ): Promise<{
    data: T;
    usedSource: Source;
    attempts: Array<{ sourceName: string; status: 'success' | 'failed' }>;
  }> {
    // Sort enabled sources by priority ascending (Priority 1 first)
    const sortedSources = [...this.group.sources]
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority);

    const attempts: Array<{ sourceName: string; status: 'success' | 'failed' }> = [];

    for (const source of sortedSources) {
      const isHealthy = await this.healthChecker.checkHealth(source);
      if (!isHealthy) {
        attempts.push({ sourceName: source.name, status: 'failed' });
        console.info(`[FailoverManager] ⚠️ ${source.name} (Prioridade ${source.priority}) OFFLINE. Tentando próxima fonte...`);
        continue;
      }

      try {
        const result = await this.resolver.resolve(source, fetchFn);
        attempts.push({ sourceName: source.name, status: 'success' });
        console.info(`[FailoverManager] ✅ Conectado com sucesso a ${source.name} (Prioridade ${source.priority})`);
        return {
          data: result,
          usedSource: source,
          attempts,
        };
      } catch (err: any) {
        attempts.push({ sourceName: source.name, status: 'failed' });
        console.warn(`[FailoverManager] ⚠️ Falha na fonte ${source.name}: ${err.message}. Acionando fallback...`);
      }
    }

    throw new Error('Todas as fontes mock do grupo falharam no processo de failover.');
  }
}

export const failoverManager = new FailoverManager();
export const sourceManager = failoverManager; // Backwards compatibility
