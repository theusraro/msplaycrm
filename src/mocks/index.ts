import { mockMovies } from './movies';
import { mockSeries } from './series';
import { mockChannels } from './channels';
import { mockProfiles } from './profiles';
import { ContentItem, TvChannel, Movie, Series } from '../types/content';

export * from './movies';
export * from './series';
export * from './channels';
export * from './epg';
export * from './profiles';

// Unified list of ContentItems
export const mockContent: ContentItem[] = [
  ...mockMovies.map(m => ({
    id: m.id,
    title: m.title,
    name: m.title,
    type: 'movie' as const,
    year: m.year,
    rating: m.rating,
    duration: m.duration,
    description: m.description,
    genres: m.genres,
    poster: m.poster,
    backdrop: m.backdrop,
    coverImage: m.backdrop,
    posterImage: m.poster,
    featured: m.featured,
  })),
  ...mockSeries.map(s => ({
    id: s.id,
    title: s.title,
    name: s.title,
    type: 'series' as const,
    year: s.year,
    rating: s.rating,
    duration: s.duration || `${s.seasonsCount} Temporadas`,
    description: s.description,
    genres: s.genres,
    poster: s.poster,
    backdrop: s.backdrop,
    coverImage: s.backdrop,
    posterImage: s.poster,
    seasons: s.seasonsCount,
    seasonsCount: s.seasonsCount,
    episodes: s.episodesCount,
    episodesCount: s.episodesCount,
    featured: s.featured,
    seasonsList: s.seasons,
  })),
  ...mockChannels.map(c => ({
    id: c.id,
    title: c.name,
    name: c.name,
    type: 'tv' as const,
    year: 2026,
    rating: 'L',
    duration: 'AO VIVO',
    description: `Canal ao vivo: ${c.programNow}`,
    genres: [c.category],
    category: c.category,
    poster: c.logo,
    backdrop: c.logo,
    coverImage: c.logo,
    posterImage: c.logo,
    logo: c.logo,
    channelName: c.name,
    programNow: c.programNow,
    programNext: c.programNext,
    isLive: c.isLive,
    schedule: c.schedule,
  }))
];

export const getMovies = (): ContentItem[] => mockContent.filter(item => item.type === 'movie');
export const getSeries = (): ContentItem[] => mockContent.filter(item => item.type === 'series');
export const getTvChannels = (): TvChannel[] => mockChannels;
export const getFeatured = (): ContentItem[] => mockContent.filter(item => item.featured);
export const getContentById = (id: string): ContentItem | undefined => mockContent.find(item => item.id === id);
export const getMovieById = (id: string): Movie | undefined => mockMovies.find(m => m.id === id);
export const getSeriesById = (id: string): Series | undefined => mockSeries.find(s => s.id === id);
export const getChannelById = (id: string): TvChannel | undefined => mockChannels.find(c => c.id === id);
