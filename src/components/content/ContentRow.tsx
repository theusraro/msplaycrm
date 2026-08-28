import React, { useRef } from 'react';
import { ContentItem } from '../../types/content';
import { ContentCard } from './ContentCard';
import { useDeviceMode } from '../../hooks/useDeviceMode';

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  variant?: 'poster' | 'wide' | 'channel';
  watchProgress?: Record<string, number>;
  onSelect?: (item: ContentItem) => void;
}

export const ContentRow: React.FC<ContentRowProps> = ({
  title,
  items,
  variant = 'poster',
  watchProgress,
  onSelect,
}) => {
  const { isTv, isMobile } = useDeviceMode();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div style={{
      marginBottom: isTv ? '40px' : isMobile ? '24px' : '32px',
      position: 'relative',
    }}>
      {/* Row Header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: isTv ? '0 var(--ms-tv-safe-area, 48px)' : isMobile ? '0 16px' : '0 32px',
        marginBottom: '12px',
      }}>
        <h2 style={{
          fontSize: isTv ? '1.5rem' : isMobile ? '1.15rem' : '1.35rem',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '0.2px',
          margin: 0,
        }}>
          {title}
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--ms-text-muted, #808080)', fontWeight: 500 }}>
          {items.length} {items.length === 1 ? 'título' : 'títulos'}
        </span>
      </div>

      {/* Horizontal Scroll Container */}
      <div style={{ position: 'relative' }} className="row-scroll-wrapper">
        {/* Left Arrow Button (Desktop / Tablet) */}
        {!isMobile && !isTv && (
          <button
            onClick={() => handleScroll('left')}
            tabIndex={-1}
            aria-label="Rolar para a esquerda"
            className="row-nav-btn left"
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(10,10,10,0.85)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              opacity: 0,
              transition: 'opacity 0.2s ease, background 0.2s ease',
            }}
          >
            ‹
          </button>
        )}

        <div
          ref={scrollRef}
          className="content-row-track hide-scrollbar"
          style={{
            display: 'flex',
            gap: isTv ? '16px' : '12px',
            overflowX: 'auto',
            scrollSnapType: isMobile ? 'x mandatory' : 'none',
            padding: isTv ? '8px var(--ms-tv-safe-area, 48px) 16px' : isMobile ? '4px 16px 12px' : '8px 32px 16px',
            scrollBehavior: 'smooth',
          }}
        >
          {items.map((item, idx) => (
            <div key={`${item.id}-${idx}`} style={{ scrollSnapAlign: 'start' }}>
              <ContentCard
                item={item}
                variant={variant}
                progress={watchProgress ? watchProgress[item.id] : item.progress}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow Button (Desktop / Tablet) */}
        {!isMobile && !isTv && (
          <button
            onClick={() => handleScroll('right')}
            tabIndex={-1}
            aria-label="Rolar para a direita"
            className="row-nav-btn right"
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(10,10,10,0.85)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              opacity: 0,
              transition: 'opacity 0.2s ease, background 0.2s ease',
            }}
          >
            ›
          </button>
        )}
      </div>

      <style>{`
        .row-scroll-wrapper:hover .row-nav-btn {
          opacity: 1 !important;
        }
        .row-nav-btn:hover {
          background: var(--ms-red, #E50914) !important;
          border-color: var(--ms-red, #E50914) !important;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
