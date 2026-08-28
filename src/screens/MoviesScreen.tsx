import React, { useState, useEffect, useMemo } from 'react';
import { contentRepository } from '../services/contentRepository';
import { ContentItem } from '../types/content';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { Header } from '../components/navigation/Header';
import { BottomNav } from '../components/navigation/BottomNav';
import { ContentCard } from '../components/content/ContentCard';
import { HeroBanner } from '../components/content/HeroBanner';

const GENRES = ['Todos', 'Ação', 'Ficção Científica', 'Suspense', 'Drama', 'Aventura', 'Terror', 'Cyberpunk'];

export default function MoviesScreen() {
  const { isMobile, isTv } = useDeviceMode();
  const [movies, setMovies] = useState<ContentItem[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentRepository.getByType('movie').then(items => {
      setMovies(items);
      setLoading(false);
    });
  }, []);

  const filteredMovies = useMemo(() => {
    if (selectedGenre === 'Todos') return movies;
    return movies.filter(m => (m.genres || []).includes(selectedGenre as any));
  }, [movies, selectedGenre]);

  const featuredMovie = movies[0];

  return (
    <div style={{
      backgroundColor: 'var(--ms-bg, #0a0a0a)',
      color: 'var(--ms-text, #ffffff)',
      minHeight: '100vh',
      paddingBottom: isMobile ? '80px' : '48px',
      overflowX: 'hidden',
    }}>
      <Header />

      {/* Hero Banner for Featured Movie */}
      {featuredMovie && <HeroBanner items={[featuredMovie, ...movies.slice(1, 4)]} />}

      <div style={{
        maxWidth: 'var(--ms-content-max-width, 1400px)',
        margin: '0 auto',
        padding: isTv ? '0 var(--ms-tv-safe-area, 48px)' : isMobile ? '0 16px' : '0 32px',
        marginTop: isMobile ? '16px' : '24px',
      }}>
        {/* Title & Genre Filters */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div>
            <h2 style={{ fontSize: isTv ? '2rem' : '1.6rem', fontWeight: 800, margin: 0 }}>
              Catálogo de Filmes
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--ms-text-muted, #808080)' }}>
              {filteredMovies.length} títulos disponíveis em alta definição
            </span>
          </div>

          {/* Filter Chips */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            width: isMobile ? '100%' : 'auto',
            paddingBottom: isMobile ? '8px' : '0',
          }}>
            {GENRES.map(genre => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                tabIndex={0}
                style={{
                  background: selectedGenre === genre ? 'var(--ms-red, #E50914)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: selectedGenre === genre ? 700 : 500,
                  cursor: 'pointer',
                  outline: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Movies Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: isTv ? '24px' : '16px',
        }}>
          {filteredMovies.map(movie => (
            <ContentCard key={movie.id} item={movie} variant="poster" />
          ))}
        </div>
      </div>

      {isMobile && <BottomNav />}
    </div>
  );
}