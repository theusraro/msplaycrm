import {
  ContentProviderAdapter,
  NormalizedChannel,
  NormalizedMovie,
  NormalizedSeries,
  NormalizedSeriesDetails,
  StreamDescriptor,
  ProviderHealth
} from './types.js';

export class MockProviderAdapter implements ContentProviderAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly type = 'mock_catalog';

  constructor(id = 'src-01', name = 'Principal Mock (Cluster Alpha)') {
    this.id = id;
    this.name = name;
  }

  async testConnection(): Promise<ProviderHealth> {
    return {
      status: 'online',
      latencyMs: 15,
      capabilities: ['live', 'movies', 'series', 'epg'],
      message: 'Cluster Mock operacional.',
      lastCheckedAt: Date.now(),
    };
  }

  async getLiveChannels(): Promise<NormalizedChannel[]> {
    return [
      {
        id: 'msplay_ch_globo_sp',
        title: 'Globo SP HD',
        logo: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=200&auto=format&fit=crop&q=80',
        category: 'Abertos',
        epgId: 'globo_sp',
        isLive: true,
        programNow: 'Jornal Hoje',
        programNext: 'Sessão da Tarde',
        sourceId: this.id,
        providerItemId: '101',
      },
      {
        id: 'msplay_ch_espn',
        title: 'ESPN Brasil HD',
        logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80',
        category: 'Esportes',
        epgId: 'espn_br',
        isLive: true,
        programNow: 'SportsCenter',
        programNext: 'Premier League Ao Vivo',
        sourceId: this.id,
        providerItemId: '102',
      },
      {
        id: 'msplay_ch_telecine_prem',
        title: 'Telecine Premium 4K',
        logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80',
        category: 'Filmes & Séries',
        epgId: 'tc_premium',
        isLive: true,
        programNow: 'Oppenheimer (2023)',
        programNext: 'Duna: Parte 2',
        sourceId: this.id,
        providerItemId: '103',
      },
      {
        id: 'msplay_ch_hbo_plus',
        title: 'HBO Plus HD',
        logo: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200&auto=format&fit=crop&q=80',
        category: 'Filmes & Séries',
        epgId: 'hbo_plus',
        isLive: true,
        programNow: 'House of the Dragon',
        programNext: 'The Last of Us',
        sourceId: this.id,
        providerItemId: '104',
      }
    ];
  }

  async getMovies(page = 1, pageSize = 20): Promise<{ items: NormalizedMovie[]; total: number }> {
    const allMovies: NormalizedMovie[] = [
      {
        id: 'msplay_mov_interestelar',
        title: 'Interestelar',
        description: 'As reservas naturais da Terra estão chegando ao fim e um grupo de astronautas recebe a missão de verificar possíveis planetas para receberem a população mundial.',
        poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80',
        year: 2014,
        rating: 8.7,
        duration: 10140, // 2h 49m
        durationLabel: '2h 49m',
        genres: ['Ficção Científica', 'Drama', 'Aventura'],
        featured: true,
        sourceId: this.id,
        providerItemId: 'mov_201',
      },
      {
        id: 'msplay_mov_oppenheimer',
        title: 'Oppenheimer',
        description: 'A história do físico J. Robert Oppenheimer, seu papel no Projeto Manhattan e o desenvolvimento da primeira bomba atômica durante a Segunda Guerra Mundial.',
        poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
        year: 2023,
        rating: 8.9,
        duration: 10800, // 3h
        durationLabel: '3h 00m',
        genres: ['Drama', 'História', 'Biografia'],
        featured: true,
        sourceId: this.id,
        providerItemId: 'mov_202',
      },
      {
        id: 'msplay_mov_cyberpulse',
        title: 'Cyberpulse: Ano 2099',
        description: 'Em uma megalópole futurista dominada por corporações quânticas, um ex-hacker descobre uma IA consciente prestes a reescrever o destino da humanidade.',
        poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80',
        year: 2025,
        rating: 9.1,
        duration: 7920,
        durationLabel: '2h 12m',
        genres: ['Ficção Científica', 'Ação', 'Cyberpunk'],
        featured: true,
        sourceId: this.id,
        providerItemId: 'mov_203',
      },
      {
        id: 'msplay_mov_the_batman',
        title: 'Batman: Cavaleiro das Trevas',
        description: 'Com a ajuda do tenente Jim Gordon e do promotor Harvey Dent, Batman mantém a ordem em Gotham até a chegada do anárquico Coringa.',
        poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&auto=format&fit=crop&q=80',
        year: 2008,
        rating: 9.0,
        duration: 9120,
        durationLabel: '2h 32m',
        genres: ['Ação', 'Crime', 'Drama'],
        sourceId: this.id,
        providerItemId: 'mov_204',
      }
    ];

    const start = (page - 1) * pageSize;
    const items = allMovies.slice(start, start + pageSize);
    return { items, total: allMovies.length };
  }

  async getSeries(page = 1, pageSize = 20): Promise<{ items: NormalizedSeries[]; total: number }> {
    const allSeries: NormalizedSeries[] = [
      {
        id: 'msplay_ser_stranger_things',
        title: 'Stranger Things',
        description: 'Quando um garoto desaparece, uma pequena cidade descobre um mistério envolvendo experimentos secretos, forças sobrenaturais e uma garota estranha.',
        poster: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=500&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
        year: 2022,
        rating: 8.7,
        genres: ['Ficção Científica', 'Terror', 'Drama'],
        seasonsCount: 4,
        featured: true,
        sourceId: this.id,
        providerItemId: 'ser_301',
      },
      {
        id: 'msplay_ser_the_last_of_us',
        title: 'The Last of Us',
        description: 'Após uma pandemia global destruir a civilização, um sobrevivente endurecido assume a responsabilidade de cuidar de uma garota de 14 anos que pode ser a última esperança.',
        poster: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
        year: 2023,
        rating: 9.2,
        genres: ['Ação', 'Aventura', 'Drama'],
        seasonsCount: 1,
        featured: true,
        sourceId: this.id,
        providerItemId: 'ser_302',
      }
    ];

    const start = (page - 1) * pageSize;
    const items = allSeries.slice(start, start + pageSize);
    return { items, total: allSeries.length };
  }

  async getSeriesDetails(id: string): Promise<NormalizedSeriesDetails | null> {
    const { items } = await this.getSeries(1, 100);
    const series = items.find(s => s.id === id || s.providerItemId === id);
    if (!series) return null;

    return {
      ...series,
      seasons: [
        {
          id: 'season_1',
          seasonNumber: 1,
          title: 'Temporada 1',
          episodes: [
            {
              id: `${series.id}_s01e01`,
              seasonNumber: 1,
              episodeNumber: 1,
              title: 'Episódio 1: O Começo',
              description: 'O início da jornada e a revelação dos primeiros enigmas.',
              duration: 3300,
              durationLabel: '55m',
              thumbnail: series.backdrop,
              sourceId: this.id,
              providerItemId: 'ep_101',
            },
            {
              id: `${series.id}_s01e02`,
              seasonNumber: 1,
              episodeNumber: 2,
              title: 'Episódio 2: A Fuga',
              description: 'Ameaças inesperadas forçam uma fuga arriscada.',
              duration: 3120,
              durationLabel: '52m',
              thumbnail: series.backdrop,
              sourceId: this.id,
              providerItemId: 'ep_102',
            }
          ]
        }
      ]
    };
  }

  async getStream(contentId: string): Promise<StreamDescriptor> {
    // Authorized demo video stream URL (HLS / MP4 test stream)
    return {
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      type: 'hls',
      expiresAt: Date.now() + 86400000,
      sourceId: this.id,
      contentId,
    };
  }
}
