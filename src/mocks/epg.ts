import { Program } from '../types/content';

export const mockEpgData: Record<string, Program[]> = {
  'tv-01': [
    { id: 'p01-1', title: 'MS Manhã Notícias', startTime: '06:00', endTime: '08:30', category: 'Notícias', description: 'Giro de notícias nacionais e internacionais para começar o dia.' },
    { id: 'p01-2', title: 'Jornal MS Primeira Edição', startTime: '08:30', endTime: '10:00', category: 'Notícias', description: 'As principais manchetes, previsão do tempo e economia.' },
    { id: 'p01-3', title: 'Mundo em Foco', startTime: '10:00', endTime: '12:00', category: 'Notícias', description: 'Debates sobre geopolítica e avanços tecnológicos.' },
    { id: 'p01-4', title: 'Jornal MS Edição Tarde', startTime: '12:00', endTime: '14:00', category: 'Notícias', description: 'Cobertura ao vivo dos fatos mais relevantes do Brasil.' },
    { id: 'p01-5', title: 'Debate Especial', startTime: '14:00', endTime: '16:00', category: 'Notícias', description: 'Mesa redonda com especialistas convidados.' },
    { id: 'p01-6', title: 'MS News Noite', startTime: '16:00', endTime: '19:30', category: 'Notícias', description: 'Análise aprofundada dos acontecimentos do dia.' },
    { id: 'p01-7', title: 'Jornal da Noite', startTime: '19:30', endTime: '22:00', category: 'Notícias', description: 'O principal telejornal da emissora com matérias exclusivas.' },
    { id: 'p01-8', title: 'Linha Direta Internacional', startTime: '22:00', endTime: '00:00', category: 'Notícias', description: 'Correspondentes de todo o mundo trazem os destaques.' },
  ],
  'tv-02': [
    { id: 'p02-1', title: 'Aquecimento Esportivo', startTime: '07:00', endTime: '09:00', category: 'Esportes', description: 'Treinos e bastidores das principais equipes.' },
    { id: 'p02-2', title: 'Futebol Ao Vivo: Rodada Principal', startTime: '09:00', endTime: '11:30', category: 'Esportes', description: 'Transmissão ao vivo com narração emocionante.' },
    { id: 'p02-3', title: 'Mesa Tática', startTime: '11:30', endTime: '13:00', category: 'Esportes', description: 'Análise de jogadas e gráficos 3D dos lances polêmicos.' },
    { id: 'p02-4', title: 'Basquete Internacional', startTime: '13:00', endTime: '15:30', category: 'Esportes', description: 'Os melhores confrontos das ligas de elite.' },
    { id: 'p02-5', title: 'Giro dos Campeões', startTime: '15:30', endTime: '18:00', category: 'Esportes', description: 'Destaques de automobilismo, tênis e vôlei.' },
    { id: 'p02-6', title: 'MS Sports Noite', startTime: '18:00', endTime: '21:00', category: 'Esportes', description: 'Debate ao vivo e gols da rodada com time de craques.' },
    { id: 'p02-7', title: 'Compacto da Rodada', startTime: '21:00', endTime: '00:00', category: 'Esportes', description: 'Melhores momentos e entrevistas pós-jogo.' },
  ],
  'tv-03': [
    { id: 'p03-1', title: 'Festival de Clássicos', startTime: '08:00', endTime: '10:30', category: 'Entretenimento', description: 'Grandes obras do cinema moderno com remasterização 4K.' },
    { id: 'p03-2', title: 'Horizonte Vermelho (Filme)', startTime: '10:30', endTime: '12:45', category: 'Entretenimento', description: 'Exibição especial do sucesso de bilheteria.' },
    { id: 'p03-3', title: 'Bastidores de Hollywood', startTime: '12:45', endTime: '14:00', category: 'Entretenimento', description: 'Entrevistas com diretores e segredos de efeitos visuais.' },
    { id: 'p03-4', title: 'Código Boreal (Filme)', startTime: '14:00', endTime: '16:00', category: 'Entretenimento', description: 'Suspense eletrizante nas geleiras do Ártico.' },
    { id: 'p03-5', title: 'Sessão Especial de Ação', startTime: '16:00', endTime: '18:30', category: 'Entretenimento', description: 'Tiros, perseguições e adrenalina pura.' },
    { id: 'p03-6', title: 'Vértice (Estreia na TV)', startTime: '18:30', endTime: '21:00', category: 'Entretenimento', description: 'A grande estreia do épico de ficção científica.' },
    { id: 'p03-7', title: 'Cine Suspense da Meia-Noite', startTime: '21:00', endTime: '00:00', category: 'Entretenimento', description: 'Histórias arrepiantes para quem não tem medo do escuro.' },
  ],
  'default': [
    { id: 'pd-1', title: 'Programação Matutina', startTime: '06:00', endTime: '09:00', category: 'Variedades', description: 'Conteúdo diversificado para começar seu dia bem informado.' },
    { id: 'pd-2', title: 'Especial em Alta Resolução', startTime: '09:00', endTime: '12:00', category: 'Variedades', description: 'O melhor conteúdo com som e imagem de cinema.' },
    { id: 'pd-3', title: 'Show da Tarde MS', startTime: '12:00', endTime: '15:00', category: 'Entretenimento', description: 'Música, entrevistas e quadros divertidos.' },
    { id: 'pd-4', title: 'Transmissão Ao Vivo', startTime: '15:00', endTime: '18:00', category: 'Ao Vivo', description: 'Cobertura em tempo real dos maiores acontecimentos.' },
    { id: 'pd-5', title: 'Super Sessão Noturna', startTime: '18:00', endTime: '21:00', category: 'Destaque', description: 'Os programas e filmes mais assistidos da nossa grade.' },
    { id: 'pd-6', title: 'Faixa Nobre MSPLAY', startTime: '21:00', endTime: '00:00', category: 'Premium', description: 'Produções originais e conteúdos exclusivos MSPLAY.' },
  ]
};

export function getChannelEpg(channelId: string): Program[] {
  return mockEpgData[channelId] || mockEpgData['default'];
}
