import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContentItem } from '../../types/content';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../ui/Toast';
import { useDeviceMode } from '../../hooks/useDeviceMode';

interface HeroBannerProps {
  items: ContentItem[];
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ items }) => {
  const navigate = useNavigate();
  const { isTv, isMobile } = useDeviceMode();
  const { state, actions } = useAppStore();
  const { showToast } = useToast();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const heroItems = items.length > 0 ? items.slice(0, 4) : [];
  const currentItem = heroItems[currentIndex] || heroItems[0];

  // Auto rotation every 8 seconds (unless paused)
  useEffect(() => {
    if (heroItems.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % heroItems.length);
    }, 8000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [heroItems.length, isPaused]);

  if (!currentItem) return null;

  const isFavorite = state.favorites.includes(currentItem.id);

  const handleToggleFavorite = () => {
    actions.toggleFavorite(currentItem.id);
    if (!isFavorite) {
      showToast(`"${currentItem.title}" adicionado à Minha Lista`, 'success');
    } else {
      showToast(`"${currentItem.title}" removido da Minha Lista`, 'info');
    }
  };

  const handleWatch = () => {
    navigate(`/player/${currentItem.id}`);
  };

  const handleDetails = () => {
    navigate(`/details/${currentItem.id}`);
  };

  return (
    <div 
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: isTv ? '75vh' : isMobile ? '65vh' : '72vh',
        minHeight: isMobile ? '460px' : '520px',
        maxHeight: '800px',
        overflow: 'hidden',
      }}
    >
      {/* Background Backdrops with crossfade */}
      {heroItems.map((item, index) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${item.backdrop || item.coverImage || item.poster})`,
            backgroundPosition: 'center 20%',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            opacity: index === currentIndex ? 1 : 0,
            transform: index === currentIndex ? 'scale(1)' : 'scale(1.04)',
            transition: 'opacity 0.8s ease-in-out, transform 8s ease-out',
            zIndex: 1,
          }}
        />
      ))}

      {/* Cinematic Overlays (Left side gradient for text readability + Bottom fade into background) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: isMobile 
          ? 'linear-gradient(to top, #0a0a0a 15%, rgba(10,10,10,0.7) 60%, rgba(10,10,10,0.3) 100%)'
          : 'linear-gradient(to right, #0a0a0a 20%, rgba(10,10,10,0.8) 50%, transparent 90%), linear-gradient(to top, #0a0a0a 0%, transparent 60%)',
        zIndex: 2,
      }} />

      {/* Content Container */}
      <div style={{
        position: 'relative',
        zIndex: 3,
        height: '100%',
        maxWidth: 'var(--ms-content-max-width, 1400px)',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: isTv ? '0 var(--ms-tv-safe-area, 48px) 48px' : isMobile ? '0 20px 28px' : '0 48px 48px',
      }}>
        <div style={{ maxWidth: isMobile ? '100%' : '650px' }}>
          {/* MSPLAY Original Tag */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(229, 9, 20, 0.15)',
            border: '1px solid rgba(229, 9, 20, 0.4)',
            padding: '4px 10px',
            borderRadius: '4px',
            marginBottom: '12px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ms-red, #E50914)' }} />
            <span style={{
              color: 'var(--ms-red, #E50914)',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}>
              MSPLAY ORIGINAL
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: isTv ? '3.5rem' : isMobile ? '2.2rem' : '3rem',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: '12px',
            textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            letterSpacing: '-0.5px',
          }}>
            {currentItem.title}
          </h1>

          {/* Metadata Badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '14px',
            fontSize: '0.875rem',
            color: 'var(--ms-text-secondary, #B3B3B3)',
          }}>
            <span style={{ color: '#46d369', fontWeight: 700 }}>98% Relevante</span>
            <span>•</span>
            <span style={{
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '1px 6px',
              borderRadius: '3px',
              fontSize: '0.75rem',
              color: '#ffffff',
              fontWeight: 600,
            }}>
              {currentItem.rating || '14'}
            </span>
            <span>•</span>
            <span>{currentItem.year}</span>
            <span>•</span>
            <span>{currentItem.duration || '2h 12min'}</span>
            <span>•</span>
            <span style={{ color: '#ffffff', fontWeight: 500 }}>
              {(currentItem.genres || ['Ação', 'Suspense']).slice(0, 2).join(' • ')}
            </span>
          </div>

          {/* Synopsis */}
          <p style={{
            fontSize: isTv ? '1.1rem' : '0.95rem',
            color: 'var(--ms-text-secondary, #B3B3B3)',
            lineHeight: 1.5,
            marginBottom: '24px',
            display: '-webkit-box',
            WebkitLineClamp: isMobile ? 2 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}>
            {currentItem.description}
          </p>

          {/* Actions Button Group */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <button
              onClick={handleWatch}
              tabIndex={0}
              className="hero-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--ms-red, #E50914)',
                color: '#ffffff',
                border: 'none',
                padding: isTv ? '14px 32px' : '12px 26px',
                borderRadius: '8px',
                fontSize: isTv ? '1.15rem' : '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 4px 16px rgba(229, 9, 20, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>▶</span>
              <span>Assistir</span>
            </button>

            <button
              onClick={handleToggleFavorite}
              tabIndex={0}
              className="hero-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: isFavorite ? 'rgba(229, 9, 20, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: isFavorite ? '1px solid var(--ms-red, #E50914)' : '1px solid rgba(255, 255, 255, 0.2)',
                padding: isTv ? '14px 24px' : '12px 20px',
                borderRadius: '8px',
                fontSize: isTv ? '1.1rem' : '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{isFavorite ? '✓' : '+'}</span>
              <span>{isFavorite ? 'Na Minha Lista' : 'Minha Lista'}</span>
            </button>

            <button
              onClick={handleDetails}
              tabIndex={0}
              className="hero-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: isTv ? '14px 24px' : '12px 20px',
                borderRadius: '8px',
                fontSize: isTv ? '1.1rem' : '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>ℹ</span>
              <span>Detalhes</span>
            </button>
          </div>
        </div>

        {/* Carousel Indicators */}
        {heroItems.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '28px',
          }}>
            {heroItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                tabIndex={0}
                aria-label={`Slide ${idx + 1}`}
                style={{
                  width: idx === currentIndex ? '32px' : '8px',
                  height: '4px',
                  borderRadius: '2px',
                  background: idx === currentIndex ? 'var(--ms-red, #E50914)' : 'rgba(255, 255, 255, 0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: idx === currentIndex ? '0 0 8px #E50914' : 'none',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .hero-btn-primary:hover, .hero-btn-primary:focus {
          background: #f6121d !important;
          transform: scale(1.04);
          box-shadow: 0 0 20px rgba(229, 9, 20, 0.8) !important;
        }
        .hero-btn-secondary:hover, .hero-btn-secondary:focus {
          background: rgba(255, 255, 255, 0.25) !important;
          border-color: #ffffff !important;
          transform: scale(1.04);
        }
      `}</style>
    </div>
  );
};
