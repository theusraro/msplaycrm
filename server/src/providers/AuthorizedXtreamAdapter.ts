import {
  ContentProviderAdapter,
  NormalizedChannel,
  NormalizedMovie,
  NormalizedSeries,
  NormalizedSeriesDetails,
  StreamDescriptor,
  ProviderHealth
} from './types.js';
import { validateSafeUrl } from '../security/ssrf.js';

export interface XtreamCredentials {
  baseUrl: string;
  username: string;
  password?: string;
  timeoutMs?: number;
}

export class AuthorizedXtreamAdapter implements ContentProviderAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly type = 'xtream';
  private config: XtreamCredentials;

  constructor(id: string, name: string, config: XtreamCredentials) {
    this.id = id;
    this.name = name;
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
      timeoutMs: config.timeoutMs || 5000,
    };
  }

  private async fetchApi(action?: string, extraParams: Record<string, string> = {}): Promise<any> {
    const ssrfCheck = validateSafeUrl(this.config.baseUrl);
    if (!ssrfCheck.valid) {
      throw new Error(`SSRF Blocked: ${ssrfCheck.reason}`);
    }

    const params = new URLSearchParams({
      username: this.config.username,
      password: this.config.password || '',
      ...(action ? { action } : {}),
      ...extraParams,
    });

    const targetUrl = `${this.config.baseUrl}/player_api.php?${params.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'MSPLAY/3.0 (Authorized Player Adapter)',
          'Accept': 'application/json',
        }
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Servidor Xtream retornou status HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Falha na comunicação com Xtream: ${err.message}`);
    }
  }

  async testConnection(): Promise<ProviderHealth> {
    const start = performance.now();
    try {
      const data = await this.fetchApi();
      const latencyMs = Math.round(performance.now() - start);

      if (data?.user_info && data.user_info.auth === 1) {
        return {
          status: 'online',
          latencyMs,
          capabilities: ['live', 'movies', 'series', 'epg'],
          message: `Autenticado com sucesso. Status: ${data.user_info.status || 'Active'}`,
          lastCheckedAt: Date.now(),
        };
      }

      return {
        status: 'degraded',
        latencyMs,
        capabilities: [],
        message: 'Credenciais inválidas ou conta expirada.',
        lastCheckedAt: Date.now(),
      };
    } catch (err: any) {
      return {
        status: 'offline',
        latencyMs: Math.round(performance.now() - start),
        capabilities: [],
        message: err.message,
        lastCheckedAt: Date.now(),
      };
    }
  }

  async getLiveChannels(): Promise<NormalizedChannel[]> {
    try {
      const streams = await this.fetchApi('get_live_streams');
      if (!Array.isArray(streams)) return [];

      return streams.map((s: any) => ({
        id: `msplay_ch_${this.id}_${s.stream_id}`,
        title: s.name || 'Canal sem nome',
        logo: s.stream_icon || '',
        category: s.category_name || 'Geral',
        epgId: s.epg_channel_id || undefined,
        isLive: true,
        sourceId: this.id,
        providerItemId: String(s.stream_id),
      }));
    } catch {
      return [];
    }
  }

  async getMovies(page = 1, pageSize = 20): Promise<{ items: NormalizedMovie[]; total: number }> {
    try {
      const vods = await this.fetchApi('get_vod_streams');
      if (!Array.isArray(vods)) return { items: [], total: 0 };

      const all = vods.map((v: any) => ({
        id: `msplay_mov_${this.id}_${v.stream_id}`,
        title: v.name || 'Filme sem título',
        description: v.plot || '',
        poster: v.stream_icon || '',
        backdrop: v.backdrop_path?.[0] || v.stream_icon || '',
        year: parseInt(v.year || '2024', 10),
        rating: parseFloat(v.rating || '8.0'),
        duration: parseInt(v.stream_duration || '7200', 10),
        durationLabel: `${Math.floor(parseInt(v.stream_duration || '7200', 10) / 60)}m`,
        genres: v.genre ? v.genre.split(',').map((g: string) => g.trim()) : ['Geral'],
        sourceId: this.id,
        providerItemId: String(v.stream_id),
      }));

      const start = (page - 1) * pageSize;
      return {
        items: all.slice(start, start + pageSize),
        total: all.length,
      };
    } catch {
      return { items: [], total: 0 };
    }
  }

  async getSeries(page = 1, pageSize = 20): Promise<{ items: NormalizedSeries[]; total: number }> {
    try {
      const seriesList = await this.fetchApi('get_series');
      if (!Array.isArray(seriesList)) return { items: [], total: 0 };

      const all = seriesList.map((s: any) => ({
        id: `msplay_ser_${this.id}_${s.series_id}`,
        title: s.name || 'Série sem título',
        description: s.plot || '',
        poster: s.cover || '',
        backdrop: s.backdrop_path?.[0] || s.cover || '',
        year: parseInt(s.releaseDate?.substring(0, 4) || '2023', 10),
        rating: parseFloat(s.rating || '8.5'),
        genres: s.genre ? s.genre.split(',').map((g: string) => g.trim()) : ['Série'],
        seasonsCount: 1,
        sourceId: this.id,
        providerItemId: String(s.series_id),
      }));

      const start = (page - 1) * pageSize;
      return {
        items: all.slice(start, start + pageSize),
        total: all.length,
      };
    } catch {
      return { items: [], total: 0 };
    }
  }

  async getSeriesDetails(id: string): Promise<NormalizedSeriesDetails | null> {
    const rawId = id.replace(new RegExp(`^msplay_ser_${this.id}_`), '');
    try {
      const data = await this.fetchApi('get_series_info', { series_id: rawId });
      if (!data?.info) return null;

      const seasons = Object.keys(data.episodes || {}).map((seasonKey) => ({
        id: `season_${seasonKey}`,
        seasonNumber: parseInt(seasonKey, 10),
        title: `Temporada ${seasonKey}`,
        episodes: (data.episodes[seasonKey] || []).map((ep: any) => ({
          id: `msplay_ep_${this.id}_${ep.id}`,
          seasonNumber: parseInt(seasonKey, 10),
          episodeNumber: parseInt(ep.episode_num || '1', 10),
          title: ep.title || `Episódio ${ep.episode_num || '1'}`,
          description: ep.info?.plot || '',
          duration: parseInt(ep.info?.duration_secs || '2400', 10),
          durationLabel: `${Math.floor(parseInt(ep.info?.duration_secs || '2400', 10) / 60)}m`,
          thumbnail: ep.info?.movie_image || '',
          sourceId: this.id,
          providerItemId: String(ep.id),
        })),
      }));

      return {
        id,
        title: data.info.name || 'Série',
        description: data.info.plot || '',
        poster: data.info.cover || '',
        backdrop: data.info.backdrop_path?.[0] || data.info.cover || '',
        year: parseInt(data.info.releaseDate?.substring(0, 4) || '2023', 10),
        rating: parseFloat(data.info.rating || '8.5'),
        genres: data.info.genre ? data.info.genre.split(',').map((g: string) => g.trim()) : ['Série'],
        seasonsCount: seasons.length,
        seasons,
        sourceId: this.id,
        providerItemId: rawId,
      };
    } catch {
      return null;
    }
  }

  async getStream(contentId: string, itemType: 'movie' | 'episode' | 'channel' = 'movie'): Promise<StreamDescriptor> {
    const rawId = contentId.replace(new RegExp(`^msplay_(mov|ser|ch|ep)_${this.id}_`), '');
    const ext = itemType === 'channel' ? 'ts' : 'mp4';
    const streamType = itemType === 'channel' ? 'live' : itemType === 'episode' ? 'series' : 'movie';
    const streamUrl = `${this.config.baseUrl}/${streamType}/${this.config.username}/${this.config.password}/${rawId}.${ext}`;

    return {
      url: streamUrl,
      type: itemType === 'channel' ? 'ts' : 'mp4',
      sourceId: this.id,
      contentId,
      expiresAt: Date.now() + 86400000,
    };
  }
}
