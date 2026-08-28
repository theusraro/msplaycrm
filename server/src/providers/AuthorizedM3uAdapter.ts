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

export interface M3uConfig {
  playlistUrl: string;
  timeoutMs?: number;
}

export class AuthorizedM3uAdapter implements ContentProviderAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly type = 'm3u';
  private config: M3uConfig;
  private cachedChannels: NormalizedChannel[] = [];
  private lastParsed = 0;

  constructor(id: string, name: string, config: M3uConfig) {
    this.id = id;
    this.name = name;
    this.config = {
      playlistUrl: config.playlistUrl,
      timeoutMs: config.timeoutMs || 8000,
    };
  }

  private async fetchPlaylist(): Promise<string> {
    const ssrfCheck = validateSafeUrl(this.config.playlistUrl);
    if (!ssrfCheck.valid) {
      throw new Error(`SSRF Blocked: ${ssrfCheck.reason}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(this.config.playlistUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MSPLAY/3.0 (Authorized M3U Parser)' }
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Falha ao baixar playlist M3U: ${err.message}`);
    }
  }

  private parseM3u(raw: string): NormalizedChannel[] {
    const lines = raw.split(/\r?\n/);
    const channels: NormalizedChannel[] = [];

    let currentMeta: { title: string; logo: string; category: string; epgId?: string } | null = null;
    let index = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#EXTINF:')) {
        const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/i);
        const groupMatch = trimmed.match(/group-title="([^"]+)"/i);
        const epgMatch = trimmed.match(/tvg-id="([^"]+)"/i);
        const titleMatch = trimmed.split(',').pop()?.trim() || `Canal ${index}`;

        currentMeta = {
          title: titleMatch,
          logo: logoMatch ? logoMatch[1] : '',
          category: groupMatch ? groupMatch[1] : 'Geral',
          epgId: epgMatch ? epgMatch[1] : undefined,
        };
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        if (currentMeta) {
          channels.push({
            id: `msplay_ch_${this.id}_${index}`,
            title: currentMeta.title,
            logo: currentMeta.logo,
            category: currentMeta.category,
            epgId: currentMeta.epgId,
            isLive: true,
            sourceId: this.id,
            providerItemId: trimmed,
          });
          index++;
          currentMeta = null;
        }
      }
    }

    return channels;
  }

  async testConnection(): Promise<ProviderHealth> {
    const start = performance.now();
    try {
      const raw = await this.fetchPlaylist();
      const latencyMs = Math.round(performance.now() - start);
      const parsed = this.parseM3u(raw);

      this.cachedChannels = parsed;
      this.lastParsed = Date.now();

      return {
        status: parsed.length > 0 ? 'online' : 'degraded',
        latencyMs,
        capabilities: ['live'],
        message: `Playlist processada com sucesso: ${parsed.length} canais identificados.`,
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
    if (this.cachedChannels.length > 0 && Date.now() - this.lastParsed < 300000) {
      return this.cachedChannels;
    }
    try {
      const raw = await this.fetchPlaylist();
      this.cachedChannels = this.parseM3u(raw);
      this.lastParsed = Date.now();
      return this.cachedChannels;
    } catch {
      return this.cachedChannels;
    }
  }

  async getMovies(): Promise<{ items: NormalizedMovie[]; total: number }> {
    return { items: [], total: 0 };
  }

  async getSeries(): Promise<{ items: NormalizedSeries[]; total: number }> {
    return { items: [], total: 0 };
  }

  async getSeriesDetails(): Promise<NormalizedSeriesDetails | null> {
    return null;
  }

  async getStream(contentId: string): Promise<StreamDescriptor> {
    const channel = this.cachedChannels.find(c => c.id === contentId);
    const url = channel ? channel.providerItemId : 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

    return {
      url,
      type: url.includes('.m3u8') ? 'hls' : 'ts',
      sourceId: this.id,
      contentId,
      expiresAt: Date.now() + 86400000,
    };
  }
}
