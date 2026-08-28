export type ContentType = 'movie' | 'series' | 'tv';

export type ContentCategory = 
  | 'Todos' 
  | 'Ação' 
  | 'Comédia' 
  | 'Drama' 
  | 'Ficção' 
  | 'Ficção Científica'
  | 'Documentários' 
  | 'Aventura' 
  | 'Suspense'
  | 'Thriller' 
  | 'Cyberpunk' 
  | 'Terror'
  | 'Histórico' 
  | 'Corrida' 
  | 'Policial' 
  | 'Natureza'
  | 'Romance'
  | 'Fantasia'
  | 'Sobrevivência';

export type TvCategory = 'Todos' | 'Abertos' | 'Notícias' | 'Esportes' | 'Infantil' | 'Entretenimento' | 'Documentários';

export interface Episode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  duration: string;
  description: string;
  thumbnail: string;
  progress?: number;
}

export interface Season {
  seasonNumber: number;
  title: string;
  episodeCount: number;
  episodes: Episode[];
}

export interface Movie {
  id: string;
  title: string;
  type: 'movie';
  year: number;
  rating: string;
  duration: string;
  description: string;
  genres: string[];
  poster: string;
  backdrop: string;
  featured?: boolean;
  director?: string;
  cast?: string[];
  videoUrl?: string;
}

export interface Series {
  id: string;
  title: string;
  type: 'series';
  year: number;
  rating: string;
  duration?: string;
  description: string;
  genres: string[];
  poster: string;
  backdrop: string;
  seasonsCount: number;
  episodesCount: number;
  seasons?: Season[];
  featured?: boolean;
  cast?: string[];
}

export interface Program {
  id: string;
  title: string;
  description?: string;
  startTime: string; // "08:00"
  endTime: string;   // "10:00"
  rating?: string;
  category?: string;
}

export interface Channel {
  id: string;
  name: string;
  number?: number;
  type: 'tv';
  logo: string;
  category: TvCategory;
  programNow: string;
  programNext: string;
  isLive: boolean;
  schedule?: Program[];
  streamUrl?: string;
}

export interface PlaybackProgress {
  contentId: string;
  progress: number; // 0.0 to 1.0
  currentTimeSeconds: number;
  durationSeconds: number;
  lastUpdated: number;
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface ContentItem {
  id: string;
  title: string;
  name?: string;
  type: ContentType;
  year: number;
  rating: string;
  duration: string;
  progress?: number;
  favorite?: boolean;
  description?: string;
  genres?: string[];
  category?: string;
  poster?: string;
  backdrop?: string;
  coverImage?: string;
  posterImage?: string;
  logo?: string;
  seasons?: number;
  episodes?: number;
  seasonsCount?: number;
  episodesCount?: number;
  currentEpisode?: number;
  channelName?: string;
  programNow?: string;
  programNext?: string;
  isLive?: boolean;
  featured?: boolean;
  seasonsList?: Season[];
  schedule?: Program[];
}

export type TvChannel = Channel;

export interface DeviceConfig {
  deviceId: string;
  deviceType: 'tv' | 'mobile' | 'tablet' | 'desktop';
  appVersion: string;
  configVersion: number;
  activePlaylistId?: string;
  fallbackPlaylistIds?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  color?: string;
  createdAt?: number;
}