import React, { useState, useEffect, useMemo } from 'react';
import { contentRepository } from '../services/contentRepository';
import { ContentItem, TvChannel } from '../types/content';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { Header } from '../components/navigation/Header';
import { BottomNav } from '../components/navigation/BottomNav';
import { ContentCard } from '../components/content/ContentCard';
import { EmptyState } from '../components/ui/EmptyState';

export default function SearchScreen() {
  const { isMobile, isTv } = useDeviceMode();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ movies: ContentItem[]; series: ContentItem[]; channels: TvChannel[] }>({
    movies: [],
    series: [],
    channels: [],
  });
  const [allFeatured, setAllFeatured] = useState<ContentItem[]>([]);

  useEffect(() => {
    contentRepository.getAll().then(all => setAllFeatured(all.slice(0, 10)));
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim()) {
        const res = await contentRepository.search(query);
        setResults(res);
      } else {
        setResults({ movies: [], series: [], channels: [] });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const hasResults = results.movies.length > 0 || results.series.length > 0 || results.channels.length > 0;
  const isSearching = query.trim().length > 0;

  return (
    <div style={{
      backgroundColor: 'var(--ms-bg, #0a0a0a)',
      color: 'var(--ms-text, #ffffff)',
      minHeight: '100vh',
      paddingTop: '80px',
      paddingBottom: isMobile ? '80px' : '48px',
    }}>
      <Header />

      <div style={{
        maxWidth: 'var(--ms-content-max-width, 1400px)',
        margin: '0 auto',
        padding: isTv ? '0 var(--ms-tv-safe-area, 48px)' : isMobile ? '0 16px' : '0 32px',
      }}>
        {/* Search Input Box */}
        <div style={{ position: 'relative', marginBottom: '32px', maxWidth: '700px' }}>
          <span style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.2rem',
            color: 'var(--ms-text-muted, #808080)',
          }}>
            🔍
          </span>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque por filmes, séries, gêneros ou canais de TV..."
            autoFocus
            tabIndex={0}
            style={{
              width: '100%',
              padding: isTv ? '18px 20px 18px 52px' : '14px 16px 14px 48px',
              backgroundColor: '#161616',
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: isTv ? '1.2rem' : '1rem',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--ms-red, #E50914)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(229,9,20,0.3)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#aaa',
                fontSize: '1.1rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Results Area */}
        {isSearching ? (
          hasResults ? (
            <div>
              {/* Movies Group */}
              {results.movies.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>
                    Filmes ({results.movies.length})
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: isTv ? '20px' : '14px',
                  }}>
                    {results.movies.map(m => (
                      <ContentCard key={m.id} item={m} variant="poster" />
                    ))}
                  </div>
                </div>
              )}

              {/* Series Group */}
              {results.series.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>
                    Séries ({results.series.length})
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: isTv ? '20px' : '14px',
                  }}>
                    {results.series.map(s => (
                      <ContentCard key={s.id} item={s} variant="poster" />
                    ))}
                  </div>
                </div>
              )}

              {/* TV Channels Group */}
              {results.channels.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>
                    Canais de TV ({results.channels.length})
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(160px, 1fr))' : 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: isTv ? '20px' : '14px',
                  }}>
                    {results.channels.map(c => (
                      <ContentCard
                        key={c.id}
                        item={{
                          id: c.id,
                          title: c.name,
                          type: 'tv',
                          year: 2026,
                          rating: 'L',
                          duration: 'AO VIVO',
                          logo: c.logo,
                          programNow: c.programNow,
                          isLive: c.isLive,
                        }}
                        variant="channel"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon="🔍"
              title="Nenhum resultado encontrado"
              description={`Não encontramos nada correspondente a "${query}". Tente buscar por outros termos, títulos ou categorias.`}
              actionLabel="Limpar Busca"
              onAction={() => setQuery('')}
            />
          )
        ) : (
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--ms-text-muted, #808080)', marginBottom: '16px' }}>
              Sugestões Populares
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: isTv ? '20px' : '14px',
            }}>
              {allFeatured.map(item => (
                <ContentCard key={item.id} item={item} variant="poster" />
              ))}
            </div>
          </div>
        )}
      </div>

      {isMobile && <BottomNav />}
    </div>
  );
}