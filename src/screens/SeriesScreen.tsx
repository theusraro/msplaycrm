import React, { useState, useEffect, useMemo } from 'react';
import { contentRepository } from '../services/contentRepository';
import { ContentItem } from '../types/content';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { Header } from '../components/navigation/Header';
import { BottomNav } from '../components/navigation/BottomNav';
import { ContentCard } from '../components/content/ContentCard';
import { HeroBanner } from '../components/content/HeroBanner';

const CATEGORIES = ['Todas', 'Em Destaque', 'Cyberpunk', 'Policial', 'Ficção Científica', 'Drama'];

export default function SeriesScreen() {
  const { isMobile, isTv } = useDeviceMode();
  const [series, setSeries] = useState<ContentItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentRepository.getByType('series').then(items => {
      setSeries(items);
      setLoading(false);
    });
  }, []);

  const filteredSeries = useMemo(() => {
    if (selectedCategory === 'Todas') return series;
    if (selectedCategory === 'Em Destaque') return series.filter(s => s.featured);
    return series.filter(s => (s.genres || []).includes(selectedCategory as any));
  }, [series, selectedCategory]);

  const featuredSeries = series[0];

  return (
    <div style={{
      backgroundColor: 'var(--ms-bg, #0a0a0a)',
      color: 'var(--ms-text, #ffffff)',
      minHeight: '100vh',
      paddingBottom: isMobile ? '80px' : '48px',
      overflowX: 'hidden',
    }}>
      <Header />

      {/* Hero Banner for Series */}
      {featuredSeries && <HeroBanner items={[featuredSeries, ...series.slice(1, 4)]} />}

      <div style={{
        maxWidth: 'var(--ms-content-max-width, 1400px)',
        margin: '0 auto',
        padding: isTv ? '0 var(--ms-tv-safe-area, 48px)' : isMobile ? '0 16px' : '0 32px',
        marginTop: isMobile ? '16px' : '24px',
      }}>
        {/* Title & Filter Chips */}
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
              Séries & Maratonas
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--ms-text-muted, #808080)' }}>
              {filteredSeries.length} séries com temporadas completas
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            width: isMobile ? '100%' : 'auto',
            paddingBottom: isMobile ? '8px' : '0',
          }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                tabIndex={0}
                style={{
                  background: selectedCategory === cat ? 'var(--ms-red, #E50914)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: selectedCategory === cat ? 700 : 500,
                  cursor: 'pointer',
                  outline: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Series Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: isTv ? '24px' : '16px',
        }}>
          {filteredSeries.map(s => (
            <ContentCard key={s.id} item={s} variant="poster" />
          ))}
        </div>
      </div>

      {isMobile && <BottomNav />}
    </div>
  );
}