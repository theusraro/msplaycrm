import React, { useEffect, useState } from 'react';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { useAppStore } from '../store/useAppStore';
import { contentRepository } from '../services/contentRepository';
import { ContentItem, TvChannel } from '../types/content';
import { Header } from '../components/navigation/Header';
import { BottomNav } from '../components/navigation/BottomNav';
import { HeroBanner } from '../components/content/HeroBanner';
import { ContentRow } from '../components/content/ContentRow';
import { SkeletonRow } from '../components/ui/SkeletonCard';

export default function HomeScreen() {
  const { isMobile, isTv } = useDeviceMode();
  const { state } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState<ContentItem[]>([]);
  const [movies, setMovies] = useState<ContentItem[]>([]);
  const [series, setSeries] = useState<ContentItem[]>([]);
  const [channels, setChannels] = useState<TvChannel[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const [allFeatured, allMovies, allSeries, allChannels] = await Promise.all([
        contentRepository.getFeatured(),
        contentRepository.getByType('movie'),
        contentRepository.getByType('series'),
        contentRepository.getChannels(),
      ]);

      if (isMounted) {
        setFeatured(allFeatured.length > 0 ? allFeatured : allMovies.slice(0, 4));
        setMovies(allMovies);
        setSeries(allSeries);
        setChannels(allChannels);
        setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Compute "Continue Assistindo" items from state.watchProgress
  const continueAssistindo = React.useMemo(() => {
    const activeProgressIds = Object.keys(state.watchProgress);
    if (activeProgressIds.length > 0) {
      return [...movies, ...series].filter(item => activeProgressIds.includes(item.id));
    }
    // Fallback initial sample with progress
    return [...movies.slice(0, 2), ...series.slice(0, 2)];
  }, [state.watchProgress, movies, series]);

  // Compute "Minha Lista" items from state.favorites
  const minhaLista = React.useMemo(() => {
    return [...movies, ...series].filter(item => state.favorites.includes(item.id));
  }, [state.favorites, movies, series]);

  const tvItems: ContentItem[] = channels.map(c => ({
    id: c.id,
    title: c.name,
    name: c.name,
    type: 'tv',
    year: 2026,
    rating: 'L',
    duration: 'AO VIVO',
    category: c.category,
    poster: c.logo,
    backdrop: c.logo,
    programNow: c.programNow,
    isLive: c.isLive,
  }));

  const lancamentos = [...movies].sort((a, b) => b.year - a.year);
  const acao = movies.filter(m => (m.genres || []).includes('Ação' as any));
  const ficcao = movies.filter(m => (m.genres || []).includes('Ficção Científica' as any));

  return (
    <div style={{
      backgroundColor: 'var(--ms-bg, #0a0a0a)',
      color: 'var(--ms-text, #ffffff)',
      minHeight: '100vh',
      paddingBottom: isMobile ? '80px' : '48px',
      overflowX: 'hidden',
    }}>
      <Header />

      {loading ? (
        <div style={{ paddingTop: '80px', paddingLeft: '32px', paddingRight: '32px' }}>
          <div style={{ height: '50vh', background: '#141414', borderRadius: '12px', marginBottom: '32px', animation: 'shimmer 1.5s infinite linear' }} />
          <SkeletonRow title="Carregando catálogo..." count={5} />
          <SkeletonRow title="Séries..." count={5} />
        </div>
      ) : (
        <>
          {/* Top Rotating Hero Banner */}
          <HeroBanner items={featured} />

          {/* Catalog Carousels */}
          <div style={{
            position: 'relative',
            zIndex: 10,
            marginTop: isMobile ? '-24px' : '-48px',
          }}>
            {/* Continue Assistindo */}
            {continueAssistindo.length > 0 && (
              <ContentRow
                title="Continue Assistindo"
                items={continueAssistindo}
                variant="wide"
                watchProgress={
                  Object.keys(state.watchProgress).length > 0
                    ? state.watchProgress
                    : { 'movie-01': 0.65, 'movie-02': 0.35, 'series-01': 0.8 }
                }
              />
            )}

            {/* Minha Lista */}
            {minhaLista.length > 0 && (
              <ContentRow
                title="Minha Lista"
                items={minhaLista}
                variant="poster"
              />
            )}

            {/* Filmes em Destaque */}
            <ContentRow
              title="Filmes em Destaque"
              items={movies.slice(0, 12)}
              variant="poster"
            />

            {/* TV Ao Vivo */}
            <ContentRow
              title="Canais de TV Ao Vivo"
              items={tvItems}
              variant="channel"
            />

            {/* Séries Populares */}
            <ContentRow
              title="Séries Populares"
              items={series.slice(0, 12)}
              variant="poster"
            />

            {/* Lançamentos 2026/2027 */}
            <ContentRow
              title="Novidades & Lançamentos"
              items={lancamentos.slice(0, 10)}
              variant="poster"
            />

            {/* Gênero: Ação e Adrenalina */}
            {acao.length > 0 && (
              <ContentRow
                title="Ação & Adrenalina"
                items={acao}
                variant="poster"
              />
            )}

            {/* Gênero: Ficção Científica */}
            {ficcao.length > 0 && (
              <ContentRow
                title="Ficção Científica & Futuro"
                items={ficcao}
                variant="poster"
              />
            )}
          </div>
        </>
      )}

      {isMobile && <BottomNav />}
    </div>
  );
}