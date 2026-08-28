import { ContentItem, TvChannel, Movie, Series } from '../types/content';
import { envConfig } from '../config/env';
import { 
  mockContent, 
  mockMovies, 
  mockSeries, 
  mockChannels, 
  getContentById, 
  getMovieById, 
  getSeriesById, 
  getChannelById 
} from '../mocks';

export interface ContentRepository {
  getAll(): Promise<ContentItem[]>;
  getById(id: string): Promise<ContentItem | null>;
  getByType(type: 'movie' | 'series' | 'tv'): Promise<ContentItem[]>;
  getMovies(): Promise<Movie[]>;
  getSeries(): Promise<Series[]>;
  getChannels(): Promise<TvChannel[]>;
  getMovie(id: string): Promise<Movie | null>;
  getSeriesItem(id: string): Promise<Series | null>;
  getChannel(id: string): Promise<TvChannel | null>;
  getFeatured(): Promise<ContentItem[]>;
  search(query: string): Promise<{ movies: ContentItem[]; series: ContentItem[]; channels: TvChannel[] }>;
  getByCategory(category: string, type?: 'movie' | 'series' | 'tv'): Promise<ContentItem[]>;
  resolvePlayback(contentId: string): Promise<{ url: string; type: string }>;
}

export class MockContentRepository implements ContentRepository {
  private delay: number;

  constructor(delayMs: number = 0) {
    this.delay = delayMs;
  }

  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
  }

  async getAll(): Promise<ContentItem[]> {
    await this.simulateDelay();
    return [...mockContent];
  }

  async getById(id: string): Promise<ContentItem | null> {
    await this.simulateDelay();
    return getContentById(id) || null;
  }

  async getByType(type: 'movie' | 'series' | 'tv'): Promise<ContentItem[]> {
    await this.simulateDelay();
    return mockContent.filter(item => item.type === type);
  }

  async getMovies(): Promise<Movie[]> {
    await this.simulateDelay();
    return [...mockMovies];
  }

  async getSeries(): Promise<Series[]> {
    await this.simulateDelay();
    return [...mockSeries];
  }

  async getChannels(): Promise<TvChannel[]> {
    await this.simulateDelay();
    return [...mockChannels];
  }

  async getMovie(id: string): Promise<Movie | null> {
    await this.simulateDelay();
    return getMovieById(id) || null;
  }

  async getSeriesItem(id: string): Promise<Series | null> {
    await this.simulateDelay();
    return getSeriesById(id) || null;
  }

  async getChannel(id: string): Promise<TvChannel | null> {
    await this.simulateDelay();
    return getChannelById(id) || null;
  }

  async getFeatured(): Promise<ContentItem[]> {
    await this.simulateDelay();
    return mockContent.filter(item => item.featured);
  }

  async search(query: string): Promise<{ movies: ContentItem[]; series: ContentItem[]; channels: TvChannel[] }> {
    await this.simulateDelay();
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
      return { movies: [], series: [], channels: [] };
    }

    const matchesQuery = (item: { title?: string; name?: string; description?: string; genres?: string[] }) => {
      const titleMatch = (item.title || item.name || '').toLowerCase().includes(cleanQuery);
      const descMatch = (item.description || '').toLowerCase().includes(cleanQuery);
      const genreMatch = (item.genres || []).some(g => g.toLowerCase().includes(cleanQuery));
      return titleMatch || descMatch || genreMatch;
    };

    const movies = mockContent.filter(item => item.type === 'movie' && matchesQuery(item));
    const series = mockContent.filter(item => item.type === 'series' && matchesQuery(item));
    const channels = mockChannels.filter(c => 
      c.name.toLowerCase().includes(cleanQuery) || 
      c.programNow.toLowerCase().includes(cleanQuery) ||
      c.category.toLowerCase().includes(cleanQuery)
    );

    return { movies, series, channels };
  }

  async getByCategory(category: string, type?: 'movie' | 'series' | 'tv'): Promise<ContentItem[]> {
    await this.simulateDelay();
    return mockContent.filter(item => {
      const typeMatches = !type || item.type === type;
      if (category === 'Todos') return typeMatches;
      const genreMatches = (item.genres || []).includes(category as any) || item.category === category;
      return typeMatches && genreMatches;
    });
  }

  async resolvePlayback(contentId: string): Promise<{ url: string; type: string }> {
    await this.simulateDelay();
    return {
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      type: 'hls',
    };
  }
}

export class RemoteContentRepository implements ContentRepository {
  private baseUrl: string;

  constructor() {
    this.baseUrl = envConfig.API_BASE_URL;
  }

  private mapMovieToContentItem(m: any): ContentItem {
    return {
      id: m.id,
      title: m.title,
      type: 'movie',
      year: m.year || 2024,
      rating: typeof m.rating === 'number' ? m.rating.toFixed(1) : (m.rating || '8.5'),
      duration: m.durationLabel || '2h 00m',
      description: m.description || '',
      genres: m.genres || ['Geral'],
      poster: m.poster || '',
      backdrop: m.backdrop || m.poster || '',
      coverImage: m.backdrop || m.poster || '',
      featured: m.featured || false,
    };
  }

  private mapSeriesToContentItem(s: any): ContentItem {
    return {
      id: s.id,
      title: s.title,
      type: 'series',
      year: s.year || 2023,
      rating: typeof s.rating === 'number' ? s.rating.toFixed(1) : (s.rating || '8.8'),
      duration: `${s.seasonsCount || 1} Temporada(s)`,
      description: s.description || '',
      genres: s.genres || ['Série'],
      poster: s.poster || '',
      backdrop: s.backdrop || s.poster || '',
      coverImage: s.backdrop || s.poster || '',
      seasonsCount: s.seasonsCount || 1,
      featured: s.featured || false,
    };
  }

  private mapChannelToTvChannel(c: any): TvChannel {
    return {
      id: c.id,
      name: c.title,
      type: 'tv',
      logo: c.logo || '',
      category: c.category || 'Geral',
      programNow: c.programNow || 'Programação Ao Vivo',
      programNext: c.programNext || 'A Seguir',
      isLive: c.isLive !== false,
      streamUrl: c.streamUrl,
    };
  }

  async getAll(): Promise<ContentItem[]> {
    const [movies, series] = await Promise.all([this.getMovies(), this.getSeries()]);
    return [...movies.map(this.mapMovieToContentItem), ...series.map(this.mapSeriesToContentItem)];
  }

  async getById(id: string): Promise<ContentItem | null> {
    if (id.startsWith('msplay_mov_')) {
      const movie = await this.getMovie(id);
      return movie ? this.mapMovieToContentItem(movie) : null;
    }
    if (id.startsWith('msplay_ser_')) {
      const series = await this.getSeriesItem(id);
      return series ? this.mapSeriesToContentItem(series) : null;
    }
    if (id.startsWith('msplay_ch_')) {
      const channel = await this.getChannel(id);
      if (!channel) return null;
      return {
        id: channel.id,
        title: channel.name,
        name: channel.name,
        type: 'tv',
        year: 2026,
        rating: '10',
        duration: 'Ao Vivo',
        description: `Canal ${channel.name} ao vivo em alta definição.`,
        poster: channel.logo,
        backdrop: channel.logo,
        logo: channel.logo,
        isLive: true,
      };
    }
    // Fallback search
    const all = await this.getAll();
    return all.find(i => i.id === id) || null;
  }

  async getByType(type: 'movie' | 'series' | 'tv'): Promise<ContentItem[]> {
    if (type === 'movie') {
      const movies = await this.getMovies();
      return movies.map(this.mapMovieToContentItem);
    }
    if (type === 'series') {
      const series = await this.getSeries();
      return series.map(this.mapSeriesToContentItem);
    }
    const channels = await this.getChannels();
    return channels.map(c => ({
      id: c.id,
      title: c.name,
      name: c.name,
      type: 'tv',
      year: 2026,
      rating: '10',
      duration: 'Ao Vivo',
      poster: c.logo,
      backdrop: c.logo,
      logo: c.logo,
      isLive: true,
      programNow: c.programNow,
      programNext: c.programNext,
      category: c.category,
    }));
  }

  async getMovies(): Promise<Movie[]> {
    try {
      const res = await fetch(`${this.baseUrl}/content/movies?page=1&pageSize=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.items || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        type: 'movie' as const,
        year: m.year,
        rating: typeof m.rating === 'number' ? m.rating.toFixed(1) : String(m.rating),
        duration: m.durationLabel || '2h 00m',
        description: m.description,
        genres: m.genres || ['Geral'],
        poster: m.poster,
        backdrop: m.backdrop,
        featured: m.featured,
      }));
    } catch {
      return [...mockMovies];
    }
  }

  async getSeries(): Promise<Series[]> {
    try {
      const res = await fetch(`${this.baseUrl}/content/series?page=1&pageSize=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.items || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        type: 'series' as const,
        year: s.year,
        rating: typeof s.rating === 'number' ? s.rating.toFixed(1) : String(s.rating),
        description: s.description,
        genres: s.genres || ['Série'],
        poster: s.poster,
        backdrop: s.backdrop,
        seasonsCount: s.seasonsCount || 1,
        episodesCount: 8,
        featured: s.featured,
      }));
    } catch {
      return [...mockSeries];
    }
  }

  async getChannels(): Promise<TvChannel[]> {
    try {
      const res = await fetch(`${this.baseUrl}/content/live`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data || []).map(this.mapChannelToTvChannel);
    } catch {
      return [...mockChannels];
    }
  }

  async getMovie(id: string): Promise<Movie | null> {
    const movies = await this.getMovies();
    return movies.find(m => m.id === id) || null;
  }

  async getSeriesItem(id: string): Promise<Series | null> {
    try {
      const res = await fetch(`${this.baseUrl}/content/series/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const s = await res.json();
      return {
        id: s.id,
        title: s.title,
        type: 'series',
        year: s.year,
        rating: typeof s.rating === 'number' ? s.rating.toFixed(1) : String(s.rating),
        description: s.description,
        genres: s.genres || ['Série'],
        poster: s.poster,
        backdrop: s.backdrop,
        seasonsCount: s.seasonsCount || 1,
        episodesCount: (s.seasons || []).reduce((acc: number, cur: any) => acc + (cur.episodes?.length || 0), 0) || 8,
        seasons: (s.seasons || []).map((season: any) => ({
          seasonNumber: season.seasonNumber,
          title: season.title,
          episodeCount: season.episodes?.length || 0,
          episodes: (season.episodes || []).map((ep: any) => ({
            id: ep.id,
            episodeNumber: ep.episodeNumber,
            seasonNumber: ep.seasonNumber,
            title: ep.title,
            duration: ep.durationLabel || '45m',
            description: ep.description || '',
            thumbnail: ep.thumbnail || s.backdrop,
          })),
        })),
        featured: s.featured,
      };
    } catch {
      return getSeriesById(id) || null;
    }
  }

  async getChannel(id: string): Promise<TvChannel | null> {
    const channels = await this.getChannels();
    return channels.find(c => c.id === id) || null;
  }

  async getFeatured(): Promise<ContentItem[]> {
    try {
      const res = await fetch(`${this.baseUrl}/content/home`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const home = await res.json();
      return (home.hero || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        type: item.id.includes('_ser_') ? 'series' : 'movie',
        year: item.year || 2024,
        rating: typeof item.rating === 'number' ? item.rating.toFixed(1) : (item.rating || '8.5'),
        duration: item.durationLabel || '2h 00m',
        description: item.description || '',
        genres: item.genres || ['Destaque'],
        poster: item.poster || '',
        backdrop: item.backdrop || item.poster || '',
        coverImage: item.backdrop || item.poster || '',
        featured: true,
      }));
    } catch {
      return mockContent.filter(item => item.featured);
    }
  }

  async search(query: string): Promise<{ movies: ContentItem[]; series: ContentItem[]; channels: TvChannel[] }> {
    try {
      const res = await fetch(`${this.baseUrl}/content/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        movies: (data.movies || []).map(this.mapMovieToContentItem),
        series: (data.series || []).map(this.mapSeriesToContentItem),
        channels: (data.channels || []).map(this.mapChannelToTvChannel),
      };
    } catch {
      const mockRepo = new MockContentRepository();
      return mockRepo.search(query);
    }
  }

  async getByCategory(category: string, type?: 'movie' | 'series' | 'tv'): Promise<ContentItem[]> {
    const all = await this.getByType(type || 'movie');
    if (category === 'Todos') return all;
    return all.filter(item => (item.genres || []).includes(category as any) || item.category === category);
  }

  async resolvePlayback(contentId: string): Promise<{ url: string; type: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/playback/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        url: data.url || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        type: data.type || 'hls',
      };
    } catch {
      return {
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        type: 'hls',
      };
    }
  }
}

// Global default instance based on feature flag
export const contentRepository: ContentRepository = envConfig.USE_REMOTE_BACKEND 
  ? new RemoteContentRepository() 
  : new MockContentRepository();
