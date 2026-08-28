import {
  NormalizedChannel,
  NormalizedMovie,
  NormalizedSeries,
  NormalizedSeriesDetails,
  StreamDescriptor,
  ContentProviderAdapter
} from '../providers/types.js';
import { AdapterFactory } from '../providers/AdapterFactory.js';
import { db } from '../database/db.js';

interface CatalogCache {
  channels: NormalizedChannel[];
  movies: NormalizedMovie[];
  series: NormalizedSeries[];
  lastSyncedAt: number;
  catalogVersion: number;
}

export class CatalogSyncService {
  private cache: CatalogCache = {
    channels: [],
    movies: [],
    series: [],
    lastSyncedAt: 0,
    catalogVersion: 1,
  };
  private ttlMs = 60000; // 1 minute cache TTL

  constructor(ttlMs = 60000) {
    this.ttlMs = ttlMs;
  }

  private async getActiveAdapter(): Promise<ContentProviderAdapter> {
    const sources = [...(await db.getSources())].sort((a, b) => a.priority - b.priority);
    const primary = sources.find(s => s.enabled && s.isOnline);

    if (primary) {
      return AdapterFactory.createAdapter(primary);
    }
    // Fallback to mock adapter
    return AdapterFactory.createAdapter({
      id: 'src-01',
      name: 'Fallback Mock Adapter',
      type: 'mock_catalog',
      endpoint: 'mock://cluster-alpha.msplay.internal/v1',
      priority: 1,
      enabled: true,
      isOnline: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  async syncCatalog(force = false): Promise<CatalogCache> {
    const now = Date.now();
    if (!force && this.cache.lastSyncedAt > 0 && now - this.cache.lastSyncedAt < this.ttlMs) {
      return this.cache;
    }

    try {
      const adapter = await this.getActiveAdapter();
      const [channels, moviesRes, seriesRes] = await Promise.all([
        adapter.getLiveChannels().catch(() => []),
        adapter.getMovies(1, 100).catch(() => ({ items: [], total: 0 })),
        adapter.getSeries(1, 100).catch(() => ({ items: [], total: 0 })),
      ]);

      this.cache = {
        channels,
        movies: moviesRes.items,
        series: seriesRes.items,
        lastSyncedAt: now,
        catalogVersion: this.cache.catalogVersion + 1,
      };
    } catch (err: any) {
      console.warn(`[CatalogSyncService] Aviso na sincronização do catálogo: ${err.message}`);
    }

    return this.cache;
  }

  async getHome(): Promise<{
    hero: (NormalizedMovie | NormalizedSeries)[];
    continueWatching: (NormalizedMovie | NormalizedSeries)[];
    liveFeatured: NormalizedChannel[];
    moviesFeatured: NormalizedMovie[];
    seriesFeatured: NormalizedSeries[];
    newReleases: (NormalizedMovie | NormalizedSeries)[];
  }> {
    const catalog = await this.syncCatalog();

    const hero = [...catalog.movies.filter(m => m.featured), ...catalog.series.filter(s => s.featured)].slice(0, 5);
    const moviesFeatured = catalog.movies.slice(0, 10);
    const seriesFeatured = catalog.series.slice(0, 10);
    const liveFeatured = catalog.channels.slice(0, 10);
    const continueWatching = [...catalog.movies.slice(0, 2), ...catalog.series.slice(0, 2)];
    const newReleases = [...catalog.movies, ...catalog.series].sort((a, b) => b.year - a.year).slice(0, 10);

    return {
      hero: hero.length > 0 ? hero : moviesFeatured.slice(0, 3),
      continueWatching,
      liveFeatured,
      moviesFeatured,
      seriesFeatured,
      newReleases,
    };
  }

  async getLiveChannels(): Promise<NormalizedChannel[]> {
    const catalog = await this.syncCatalog();
    return catalog.channels;
  }

  async getMovies(page = 1, pageSize = 20, genre?: string): Promise<{ items: NormalizedMovie[]; total: number; catalogVersion: number }> {
    const catalog = await this.syncCatalog();
    let filtered = catalog.movies;
    if (genre && genre !== 'Todos') {
      filtered = filtered.filter(m => m.genres.includes(genre));
    }
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      catalogVersion: catalog.catalogVersion,
    };
  }

  async getSeries(page = 1, pageSize = 20, genre?: string): Promise<{ items: NormalizedSeries[]; total: number; catalogVersion: number }> {
    const catalog = await this.syncCatalog();
    let filtered = catalog.series;
    if (genre && genre !== 'Todos') {
      filtered = filtered.filter(s => s.genres.includes(genre));
    }
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      catalogVersion: catalog.catalogVersion,
    };
  }

  async getSeriesDetails(id: string): Promise<NormalizedSeriesDetails | null> {
    const adapter = await this.getActiveAdapter();
    return await adapter.getSeriesDetails(id);
  }

  async search(query: string): Promise<{
    movies: NormalizedMovie[];
    series: NormalizedSeries[];
    channels: NormalizedChannel[];
  }> {
    const catalog = await this.syncCatalog();
    const clean = (query || '').toLowerCase().trim();
    if (!clean) {
      return { movies: [], series: [], channels: [] };
    }

    const movies = catalog.movies.filter(m =>
      m.title.toLowerCase().includes(clean) ||
      m.description.toLowerCase().includes(clean) ||
      m.genres.some(g => g.toLowerCase().includes(clean))
    );

    const series = catalog.series.filter(s =>
      s.title.toLowerCase().includes(clean) ||
      s.description.toLowerCase().includes(clean) ||
      s.genres.some(g => g.toLowerCase().includes(clean))
    );

    const channels = catalog.channels.filter(c =>
      c.title.toLowerCase().includes(clean) ||
      c.category.toLowerCase().includes(clean)
    );

    return { movies, series, channels };
  }

  async resolvePlayback(contentId: string, _deviceId?: string): Promise<StreamDescriptor> {
    const adapter = await this.getActiveAdapter();
    let itemType: 'movie' | 'episode' | 'channel' = 'movie';

    if (contentId.includes('_ch_')) itemType = 'channel';
    else if (contentId.includes('_ep_') || contentId.includes('_ser_')) itemType = 'episode';

    return await adapter.getStream(contentId, itemType);
  }
}

export const catalogSyncService = new CatalogSyncService();
