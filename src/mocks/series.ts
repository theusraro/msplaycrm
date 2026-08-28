import { Series, Season, Episode } from '../types/content';
import { generatePoster, generateBackdrop, generateEpisodeThumb } from '../utils/imageGenerator';

function buildSeasons(seriesId: string, seriesTitle: string, seasonCount: number = 3): Season[] {
  const seasons: Season[] = [];
  
  for (let s = 1; s <= seasonCount; s++) {
    const episodes: Episode[] = [];
    const epCount = s === 1 ? 8 : s === 2 ? 10 : 8;
    
    for (let e = 1; e <= epCount; e++) {
      episodes.push({
        id: `${seriesId}-s${s}e${e}`,
        seasonNumber: s,
        episodeNumber: e,
        title: `Episódio ${e}: ${getEpisodeTitle(seriesTitle, s, e)}`,
        duration: `${40 + ((e * 3) % 15)}min`,
        description: `Na temporada ${s}, episódio ${e}, os eventos tomam um rumo inesperado com revelações cruciais sobre os mistérios de ${seriesTitle}.`,
        thumbnail: generateEpisodeThumb(seriesTitle, (s - 1) * 10 + e),
        progress: s === 1 && e === 1 ? 0.65 : undefined
      });
    }
    
    seasons.push({
      seasonNumber: s,
      title: `Temporada ${s}`,
      episodeCount: episodes.length,
      episodes
    });
  }
  
  return seasons;
}

function getEpisodeTitle(seriesTitle: string, season: number, ep: number): string {
  const titles = [
    'O Primeiro Sinal',
    'Ruptura no Sistema',
    'Ecos do Passado',
    'Zona Proibida',
    'Convergência',
    'Ponto Sem Retorno',
    'A Revelação',
    'Nova Ordem',
    'Sobrecarga',
    'O Eclipse Final'
  ];
  return titles[(season * 3 + ep) % titles.length];
}

export const mockSeries: Series[] = [
  {
    id: 'series-01',
    title: 'Distrito Zero',
    type: 'series',
    year: 2026,
    rating: '18',
    duration: '3 Temporadas',
    description: 'Na megalópole subterrânea de Nova Esperança, facções cibernéticas e corporações obscuras disputam o controle da última rede neural não monitorada.',
    genres: ['Cyberpunk', 'Ação', 'Suspense'],
    featured: true,
    seasonsCount: 3,
    episodesCount: 26,
    seasons: buildSeasons('series-01', 'Distrito Zero', 3),
    poster: generatePoster('Distrito Zero Série', 'Cyberpunk Series', 2026),
    backdrop: generateBackdrop('Distrito Zero Série', 'A guerra pelas sombras digitais')
  },
  {
    id: 'series-02',
    title: 'Código Vermelho',
    type: 'series',
    year: 2025,
    rating: '16',
    duration: '3 Temporadas',
    description: 'Uma unidade tática secreta de inteligência internacional é acionada para conter ameaças bioterroristas e conspirações globais de alta tecnologia.',
    genres: ['Policial', 'Ação', 'Thriller'],
    featured: true,
    seasonsCount: 3,
    episodesCount: 26,
    seasons: buildSeasons('series-02', 'Código Vermelho', 3),
    poster: generatePoster('Código Vermelho', 'Policial Tático', 2025),
    backdrop: generateBackdrop('Código Vermelho', 'Ameaça em nível máximo')
  },
  {
    id: 'series-03',
    title: 'Linha Fantasma',
    type: 'series',
    year: 2024,
    rating: '14',
    duration: '2 Temporadas',
    description: 'Um ramal de metrô desativado em São Paulo começa a transportar passageiros para pontos no tempo onde tragédias históricas podem ser evitadas.',
    genres: ['Ficção Científica', 'Mistério', 'Drama'],
    seasonsCount: 2,
    episodesCount: 16,
    seasons: buildSeasons('series-03', 'Linha Fantasma', 2),
    poster: generatePoster('Linha Fantasma', 'Mistério Temporal', 2024),
    backdrop: generateBackdrop('Linha Fantasma', 'Os trilhos que desafiam a linha do tempo')
  },
  {
    id: 'series-04',
    title: 'Setor 9',
    type: 'series',
    year: 2026,
    rating: '16',
    duration: '2 Temporadas',
    description: 'Em uma colônia de mineração na órbita de Júpiter, trabalhadores descobrem que o combustível extraído possui propriedades biológicas conscientes.',
    genres: ['Ficção Científica', 'Suspense'],
    seasonsCount: 2,
    episodesCount: 18,
    seasons: buildSeasons('series-04', 'Setor 9', 2),
    poster: generatePoster('Setor 9', 'Ficção Espacial', 2026),
    backdrop: generateBackdrop('Setor 9', 'Nas luas frias de Júpiter')
  },
  {
    id: 'series-05',
    title: 'Nexus',
    type: 'series',
    year: 2025,
    rating: '14',
    duration: '1 Temporada',
    description: 'Crianças nascidas com conexões telepáticas espontâneas tornam-se alvo de governos e institutos de pesquisa que querem clonar suas habilidades.',
    genres: ['Ficção Científica', 'Drama', 'Aventura'],
    seasonsCount: 1,
    episodesCount: 8,
    seasons: buildSeasons('series-05', 'Nexus', 1),
    poster: generatePoster('Nexus', 'Sci-Fi Drama', 2025),
    backdrop: generateBackdrop('Nexus', 'Mentes conectadas pelo destino')
  },
  {
    id: 'series-06',
    title: 'Horizonte',
    type: 'series',
    year: 2026,
    rating: '16',
    duration: '3 Temporadas',
    description: 'A épica colonização das planícies marcianas, com intrigas políticas, desastres atmosféricos e o surgimento da primeira geração marciana.',
    genres: ['Ficção Científica', 'Drama', 'Aventura'],
    featured: true,
    seasonsCount: 3,
    episodesCount: 26,
    seasons: buildSeasons('series-06', 'Horizonte', 3),
    poster: generatePoster('Horizonte Série', 'Épico Sci-Fi', 2026),
    backdrop: generateBackdrop('Horizonte Série', 'O nascimento de um novo mundo')
  },
  {
    id: 'series-07',
    title: 'Terminal',
    type: 'series',
    year: 2024,
    rating: '16',
    duration: '2 Temporadas',
    description: 'Um vírus cibernético assume o controle do maior aeroporto internacional do mundo, trancando milhares de passageiros em um confinamento claustrofóbico.',
    genres: ['Thriller', 'Ação', 'Suspense'],
    seasonsCount: 2,
    episodesCount: 14,
    seasons: buildSeasons('series-07', 'Terminal', 2),
    poster: generatePoster('Terminal', 'Suspense Tecnológico', 2024),
    backdrop: generateBackdrop('Terminal', 'Ninguém entra. Ninguém sai.')
  },
  {
    id: 'series-08',
    title: 'Projeto Atlas',
    type: 'series',
    year: 2025,
    rating: '14',
    duration: '2 Temporadas',
    description: 'Uma corporação de geoengenharia tenta reverter o aquecimento global, mas uma anomalia em seus satélites altera as estações climáticas imprevisivelmente.',
    genres: ['Drama', 'Ficção', 'Suspense'],
    seasonsCount: 2,
    episodesCount: 16,
    seasons: buildSeasons('series-08', 'Projeto Atlas', 2),
    poster: generatePoster('Projeto Atlas', 'Geoengenharia', 2025),
    backdrop: generateBackdrop('Projeto Atlas', 'O controle do clima nas mãos erradas')
  },
  {
    id: 'series-09',
    title: 'Rota Norte',
    type: 'series',
    year: 2024,
    rating: '16',
    duration: '2 Temporadas',
    description: 'Caminhoneiros em comboio pelas estradas de gelo da Sibéria transportam equipamentos ultrassecretos enquanto enfrentam nevascas mortais e sabotadores.',
    genres: ['Ação', 'Aventura', 'Sobrevivência'],
    seasonsCount: 2,
    episodesCount: 16,
    seasons: buildSeasons('series-09', 'Rota Norte', 2),
    poster: generatePoster('Rota Norte', 'Ação no Gelo', 2024),
    backdrop: generateBackdrop('Rota Norte', 'Onde o frio não perdoa erros')
  },
  {
    id: 'series-10',
    title: 'Ponto de Ruptura',
    type: 'series',
    year: 2026,
    rating: '18',
    duration: '3 Temporadas',
    description: 'Um thriller corporativo sobre a luta pelo domínio de patentes de fusão nuclear limpa e as mortes misteriosas dos principais engenheiros do setor.',
    genres: ['Drama', 'Policial', 'Thriller'],
    seasonsCount: 3,
    episodesCount: 26,
    seasons: buildSeasons('series-10', 'Ponto de Ruptura', 3),
    poster: generatePoster('Ponto de Ruptura', 'Thriller Corporativo', 2026),
    backdrop: generateBackdrop('Ponto de Ruptura', 'A energia que move a ganância')
  },
  {
    id: 'series-11',
    title: 'Sombra e Fogo',
    type: 'series',
    year: 2025,
    rating: '16',
    duration: '1 Temporada',
    description: 'Bombeiros de resgate florestal especializados enfrentam megaincêndios que revelam ruínas arqueológicas e mistérios ancestrais.',
    genres: ['Drama', 'Ação', 'Natureza'],
    seasonsCount: 1,
    episodesCount: 8,
    seasons: buildSeasons('series-11', 'Sombra e Fogo', 1),
    poster: generatePoster('Sombra e Fogo', 'Resgate Heroico', 2025),
    backdrop: generateBackdrop('Sombra e Fogo', 'Na linha de frente contra as chamas')
  },
  {
    id: 'series-12',
    title: 'Vigilantes de Aço',
    type: 'series',
    year: 2024,
    rating: '14',
    duration: '2 Temporadas',
    description: 'Pilotos de exoesqueletos mecanizados patrulham fronteiras urbanas em um futuro onde frotas de drones autônomos se rebelaram.',
    genres: ['Ação', 'Cyberpunk', 'Ficção'],
    seasonsCount: 2,
    episodesCount: 16,
    seasons: buildSeasons('series-12', 'Vigilantes de Aço', 2),
    poster: generatePoster('Vigilantes de Aço', 'Mecha Action', 2024),
    backdrop: generateBackdrop('Vigilantes de Aço', 'Blindagem pesada para tempos sombrios')
  },
  {
    id: 'series-13',
    title: 'A Floresta Profunda',
    type: 'series',
    year: 2026,
    rating: 'L',
    duration: '1 Temporada',
    description: 'Série documental que explora o dossel e as profundezas inexploradas da Amazônia com tecnologia de câmeras infravermelhas e drones subaquáticos.',
    genres: ['Documentários', 'Natureza'],
    seasonsCount: 1,
    episodesCount: 6,
    seasons: buildSeasons('series-13', 'A Floresta Profunda', 1),
    poster: generatePoster('A Floresta Profunda', 'Doc Natureza', 2026),
    backdrop: generateBackdrop('A Floresta Profunda', 'Os segredos da maior biodiversidade do mundo')
  },
  {
    id: 'series-14',
    title: 'Circuito Noturno',
    type: 'series',
    year: 2025,
    rating: '16',
    duration: '2 Temporadas',
    description: 'Pilotos de corridas de rua elétricas em Tóquio disputam tecnologia automotiva de ponta e contratos milionários de fabricantes esportivas.',
    genres: ['Ação', 'Corrida', 'Drama'],
    seasonsCount: 2,
    episodesCount: 14,
    seasons: buildSeasons('series-14', 'Circuito Noturno', 2),
    poster: generatePoster('Circuito Noturno', 'Corrida Noturna', 2025),
    backdrop: generateBackdrop('Circuito Noturno', 'Velocidade sob as luzes da metrópole')
  },
  {
    id: 'series-15',
    title: 'Império das Sombras',
    type: 'series',
    year: 2025,
    rating: '18',
    duration: '3 Temporadas',
    description: 'Uma saga dinástica e violenta sobre a ascensão de uma família que monopoliza o mercado farmacêutico e de implantes biométricos.',
    genres: ['Drama', 'Thriller', 'Policial'],
    seasonsCount: 3,
    episodesCount: 26,
    seasons: buildSeasons('series-15', 'Império das Sombras', 3),
    poster: generatePoster('Império das Sombras', 'Saga Dinástica', 2025),
    backdrop: generateBackdrop('Império das Sombras', 'O poder tem um preço impagável')
  },
  {
    id: 'series-16',
    title: 'Detetives do Asfalto',
    type: 'series',
    year: 2024,
    rating: '14',
    duration: '2 Temporadas',
    description: 'Dois policiais com métodos totalmente opostos investigam casos intrigantes e crimes incomuns nas rodovias interestaduais.',
    genres: ['Policial', 'Comédia', 'Drama'],
    seasonsCount: 2,
    episodesCount: 16,
    seasons: buildSeasons('series-16', 'Detetives do Asfalto', 2),
    poster: generatePoster('Detetives do Asfalto', 'Policial', 2024),
    backdrop: generateBackdrop('Detetives do Asfalto', 'A lei nas estradas')
  },
  {
    id: 'series-17',
    title: 'Reino Animal',
    type: 'series',
    year: 2026,
    rating: 'L',
    duration: '1 Temporada',
    description: 'As estratégias de sobrevivência, liderança e comunicação das espécies animais mais fascinantes dos cinco continentes.',
    genres: ['Documentários', 'Natureza', 'Família'],
    seasonsCount: 1,
    episodesCount: 8,
    seasons: buildSeasons('series-17', 'Reino Animal', 1),
    poster: generatePoster('Reino Animal', 'Vida Selvagem', 2026),
    backdrop: generateBackdrop('Reino Animal', 'A majestade do mundo natural')
  },
  {
    id: 'series-18',
    title: 'Camada Zero',
    type: 'series',
    year: 2025,
    rating: '16',
    duration: '2 Temporadas',
    description: 'Engenheiros de dados descobrem que a camada fundamental da internet está desenvolvendo uma mente coletiva que prevê ações humanas.',
    genres: ['Cyberpunk', 'Thriller', 'Ficção'],
    seasonsCount: 2,
    episodesCount: 16,
    seasons: buildSeasons('series-18', 'Camada Zero', 2),
    poster: generatePoster('Camada Zero', 'Cyber Thriller', 2025),
    backdrop: generateBackdrop('Camada Zero', 'A consciência que reside nos cabos submarinos')
  },
  {
    id: 'series-19',
    title: 'Fronteira Sul',
    type: 'series',
    year: 2027,
    rating: '18',
    duration: '2 Temporadas',
    description: 'Agentes federais e guardas florestais enfrentam contrabandistas de espécies exóticas e madeireiras clandestinas no extremo sul do país.',
    genres: ['Ação', 'Drama', 'Policial'],
    seasonsCount: 2,
    episodesCount: 16,
    seasons: buildSeasons('series-19', 'Fronteira Sul', 2),
    poster: generatePoster('Fronteira Sul', 'Ação Policial', 2027),
    backdrop: generateBackdrop('Fronteira Sul', 'Onde o perigo se esconde na mata')
  },
  {
    id: 'series-20',
    title: 'Zona Neutra',
    type: 'series',
    year: 2025,
    rating: '16',
    duration: '2 Temporadas',
    description: 'Em uma ilha desmilitarizada no Pacífico, diplomatas de nações rivais tentam impedir uma guerra total enquanto espiões operam às escondidas.',
    genres: ['Drama', 'Espionagem', 'Suspense'],
    seasonsCount: 2,
    episodesCount: 16,
    seasons: buildSeasons('series-20', 'Zona Neutra', 2),
    poster: generatePoster('Zona Neutra', 'Espionagem', 2025),
    backdrop: generateBackdrop('Zona Neutra', 'A paz por um fio de navalha')
  }
];
