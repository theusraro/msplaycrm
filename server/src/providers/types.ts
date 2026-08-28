export interface NormalizedChannel {
  id: string;
  title: string;
  logo: string;
  category: string;
  epgId?: string;
  isLive: boolean;
  programNow?: string;
  programNext?: string;
  sourceId: string;
  providerItemId: string;
}

export interface NormalizedMovie {
  id: string;
  title: string;
  description: string;
  poster: string;
  backdrop: string;
  year: number;
  rating: number;
  duration: number; // in seconds or minutes
  durationLabel: string;
  genres: string[];
  featured?: boolean;
  sourceId: string;
  providerItemId: string;
}

export interface NormalizedEpisode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description: string;
  duration: number;
  durationLabel: string;
  thumbnail: string;
  sourceId: string;
  providerItemId: string;
}

export interface NormalizedSeason {
  id: string;
  seasonNumber: number;
  title: string;
  episodes: NormalizedEpisode[];
}

export interface NormalizedSeries {
  id: string;
  title: string;
  description: string;
  poster: string;
  backdrop: string;
  year: number;
  rating: number;
  genres: string[];
  seasonsCount: number;
  featured?: boolean;
  sourceId: string;
  providerItemId: string;
}

export interface NormalizedSeriesDetails extends NormalizedSeries {
  seasons: NormalizedSeason[];
}

export interface StreamDescriptor {
  url: string;
  type: 'hls' | 'mp4' | 'ts';
  expiresAt?: number;
  headers?: Record<string, string>;
  sourceId: string;
  contentId: string;
}

export interface EpgProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
}

export interface ProviderHealth {
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  latencyMs: number;
  capabilities: Array<'live' | 'movies' | 'series' | 'epg'>;
  message?: string;
  lastCheckedAt: number;
}

export interface ContentProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly type: string;

  testConnection(): Promise<ProviderHealth>;
  getLiveChannels(): Promise<NormalizedChannel[]>;
  getMovies(page?: number, pageSize?: number): Promise<{ items: NormalizedMovie[]; total: number }>;
  getSeries(page?: number, pageSize?: number): Promise<{ items: NormalizedSeries[]; total: number }>;
  getSeriesDetails(id: string): Promise<NormalizedSeriesDetails | null>;
  getStream(contentId: string, itemType?: 'movie' | 'episode' | 'channel'): Promise<StreamDescriptor>;
  getEpg?(channelId?: string): Promise<EpgProgram[]>;
}
