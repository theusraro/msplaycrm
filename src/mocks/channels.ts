import { Channel } from '../types/content';
import { generateChannelLogo } from '../utils/imageGenerator';
import { getChannelEpg } from './epg';

export const mockChannels: Channel[] = [
  {
    id: 'tv-01',
    name: 'MS News',
    number: 1,
    type: 'tv',
    category: 'Notícias',
    isLive: true,
    programNow: 'Jornal MS Primeira Edição',
    programNext: 'Mundo em Foco (10:00)',
    logo: generateChannelLogo('MS News', 'Notícias 24h'),
    schedule: getChannelEpg('tv-01')
  },
  {
    id: 'tv-02',
    name: 'MS Sports',
    number: 2,
    type: 'tv',
    category: 'Esportes',
    isLive: true,
    programNow: 'Futebol Ao Vivo: Rodada Principal',
    programNext: 'Mesa Tática (11:30)',
    logo: generateChannelLogo('MS Sports', 'Esportes'),
    schedule: getChannelEpg('tv-02')
  },
  {
    id: 'tv-03',
    name: 'MS Cinema',
    number: 3,
    type: 'tv',
    category: 'Entretenimento',
    isLive: true,
    programNow: 'Horizonte Vermelho (Filme)',
    programNext: 'Bastidores de Hollywood (12:45)',
    logo: generateChannelLogo('MS Cinema', 'Filmes 4K'),
    schedule: getChannelEpg('tv-03')
  },
  {
    id: 'tv-04',
    name: 'MS Series',
    number: 4,
    type: 'tv',
    category: 'Entretenimento',
    isLive: true,
    programNow: 'Distrito Zero (S01E04)',
    programNext: 'Código Vermelho (11:00)',
    logo: generateChannelLogo('MS Series', 'Séries Exclusivas'),
    schedule: getChannelEpg('tv-04')
  },
  {
    id: 'tv-05',
    name: 'MS Kids',
    number: 5,
    type: 'tv',
    category: 'Infantil',
    isLive: true,
    programNow: 'Aventuras na Floresta Mágica',
    programNext: 'Super Heróis do Amanhã (10:30)',
    logo: generateChannelLogo('MS Kids', 'Infantil'),
    schedule: getChannelEpg('tv-05')
  },
  {
    id: 'tv-06',
    name: 'MS Action',
    number: 6,
    type: 'tv',
    category: 'Entretenimento',
    isLive: true,
    programNow: 'Maratona Velocidade Extrema',
    programNext: 'Combate Tático (12:00)',
    logo: generateChannelLogo('MS Action', 'Ação Pura'),
    schedule: getChannelEpg('tv-06')
  },
  {
    id: 'tv-07',
    name: 'MS Music',
    number: 7,
    type: 'tv',
    category: 'Entretenimento',
    isLive: true,
    programNow: 'Top 50 Sucessos Globais',
    programNext: 'Festival de Música Eletrônica (11:00)',
    logo: generateChannelLogo('MS Music', 'Música 24h'),
    schedule: getChannelEpg('tv-07')
  },
  {
    id: 'tv-08',
    name: 'MS Documentary',
    number: 8,
    type: 'tv',
    category: 'Documentários',
    isLive: true,
    programNow: 'Mistérios do Universo Profundo',
    programNext: 'Oceanos Inexplorados (11:15)',
    logo: generateChannelLogo('MS Documentary', 'Documentários'),
    schedule: getChannelEpg('tv-08')
  },
  {
    id: 'tv-09',
    name: 'MS 1',
    number: 9,
    type: 'tv',
    category: 'Abertos',
    isLive: true,
    programNow: 'Bom Dia MSPLAY',
    programNext: 'Revista Eletrônica (10:00)',
    logo: generateChannelLogo('MS 1', 'Canal Aberto'),
    schedule: getChannelEpg('tv-09')
  },
  {
    id: 'tv-10',
    name: 'MS Esportes 2',
    number: 10,
    type: 'tv',
    category: 'Esportes',
    isLive: true,
    programNow: 'Liga Internacional de Vôlei',
    programNext: 'Automobilismo: Treino Livre (12:00)',
    logo: generateChannelLogo('MS Esportes 2', 'Esportes Radicais'),
    schedule: getChannelEpg('tv-10')
  },
  {
    id: 'tv-11',
    name: 'MS Filmes',
    number: 11,
    type: 'tv',
    category: 'Entretenimento',
    isLive: true,
    programNow: 'Sessão Comédia da Manhã',
    programNext: 'Suspense na Neve (11:40)',
    logo: generateChannelLogo('MS Filmes', 'Cinema em Casa'),
    schedule: getChannelEpg('tv-11')
  },
  {
    id: 'tv-12',
    name: 'MS Docs',
    number: 12,
    type: 'tv',
    category: 'Documentários',
    isLive: true,
    programNow: 'Civilizações Perdidas da América',
    programNext: 'Revoluções Industriais (11:00)',
    logo: generateChannelLogo('MS Docs', 'História e Ciência'),
    schedule: getChannelEpg('tv-12')
  },
  {
    id: 'tv-13',
    name: 'MS Lifestyle',
    number: 13,
    type: 'tv',
    category: 'Entretenimento',
    isLive: true,
    programNow: 'Gastronomia Molecular & Sabores',
    programNext: 'Arquitetura Futurista (10:45)',
    logo: generateChannelLogo('MS Lifestyle', 'Estilo de Vida'),
    schedule: getChannelEpg('tv-13')
  },
  {
    id: 'tv-14',
    name: 'MS Educação',
    number: 14,
    type: 'tv',
    category: 'Infantil',
    isLive: true,
    programNow: 'Aprenda Programação Criativa',
    programNext: 'Física no Cotidiano (10:30)',
    logo: generateChannelLogo('MS Educação', 'Conhecimento'),
    schedule: getChannelEpg('tv-14')
  },
  {
    id: 'tv-15',
    name: 'MS Retro',
    number: 15,
    type: 'tv',
    category: 'Entretenimento',
    isLive: true,
    programNow: 'Anos 80 & 90: Os Grandes Clássicos',
    programNext: 'Músicas que Marcaram Época (11:00)',
    logo: generateChannelLogo('MS Retro', 'Clássicos Nostálgicos'),
    schedule: getChannelEpg('tv-15')
  },
  {
    id: 'tv-16',
    name: 'MS Tech',
    number: 16,
    type: 'tv',
    category: 'Notícias',
    isLive: true,
    programNow: 'Inteligência Artificial em Foco',
    programNext: 'Lançamentos de Hardware (11:30)',
    logo: generateChannelLogo('MS Tech', 'Tecnologia & Games'),
    schedule: getChannelEpg('tv-16')
  }
];
