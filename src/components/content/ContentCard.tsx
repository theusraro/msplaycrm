import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ContentItem } from '../../types/content';
import { useDeviceMode } from '../../hooks/useDeviceMode';

interface ContentCardProps {
  item: ContentItem;
  variant?: 'poster' | 'wide' | 'channel';
  progress?: number;
  onSelect?: (item: ContentItem) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  variant = 'poster',
  progress,
  onSelect,
}) => {
  const navigate = useNavigate();
  const { isTv, isMobile } = useDeviceMode();

  const handleClick = () => {
    if (onSelect) {
      onSelect(item);
      return;
    }

    if (item.type === 'tv') {
      navigate(`/player/${item.id}`);
    } else {
      navigate(`/details/${item.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  // Dimensions based on variant & device
  const getDimensions = () => {
    if (variant === 'wide') {
      return {
        width: isTv ? '320px' : isMobile ? '240px' : '280px',
        height: isTv ? '180px' : isMobile ? '135px' : '158px',
      };
    }
    if (variant === 'channel') {
      return {
        width: isTv ? '240px' : isMobile ? '180px' : '210px',
        height: isTv ? '140px' : isMobile ? '110px' : '125px',
      };
    }
    // Default poster
    return {
      width: isTv ? '200px' : isMobile ? '130px' : '160px',
      height: isTv ? '300px' : isMobile ? '195px' : '240px',
    };
  };

  const dimensions = getDimensions();
  const imageSource = variant === 'wide'
    ? (item.backdrop || item.coverImage || item.poster)
    : (item.poster || item.posterImage || item.logo || item.backdrop);

  return (
    <div
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="msplay-content-card"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        flexShrink: 0,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        outline: 'none',
        backgroundColor: '#161616',
        backgroundImage: `url(${imageSource})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease',
        border: '2px solid transparent',
      }}
    >
      {/* Dark gradient for text legibility */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.4) 40%, transparent 80%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10px 12px',
      }}>
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {item.isLive || item.type === 'tv' ? (
            <span style={{
              background: 'var(--ms-red, #E50914)',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '1px',
              boxShadow: '0 2px 6px rgba(229,9,20,0.5)',
            }}>
              AO VIVO
            </span>
          ) : (
            item.rating && (
              <span style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: '3px',
                backdropFilter: 'blur(4px)',
              }}>
                {item.rating}
              </span>
            )
          )}
        </div>

        {/* Bottom Metadata */}
        <div>
          <h4 style={{
            color: '#ffffff',
            fontSize: isTv ? '1.05rem' : '0.875rem',
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          }}>
            {item.title || item.name}
          </h4>

          {variant === 'channel' && item.programNow && (
            <p style={{
              margin: '2px 0 0',
              fontSize: '0.72rem',
              color: 'var(--ms-text-secondary, #B3B3B3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {item.programNow}
            </p>
          )}

          {variant !== 'channel' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '4px',
              fontSize: '0.72rem',
              color: 'var(--ms-text-secondary, #B3B3B3)',
            }}>
              <span>{item.year || 2026}</span>
              {item.duration && (
                <>
                  <span>•</span>
                  <span>{item.duration}</span>
                </>
              )}
            </div>
          )}

          {/* Continue Watching Progress Bar */}
          {typeof progress === 'number' && progress > 0 && (
            <div style={{
              marginTop: '8px',
              width: '100%',
              height: '4px',
              background: 'rgba(255,255,255,0.25)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(100, Math.max(5, progress * 100))}%`,
                height: '100%',
                background: 'var(--ms-red, #E50914)',
                borderRadius: '2px',
                boxShadow: '0 0 6px #E50914',
              }} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .msplay-content-card:hover, .msplay-content-card:focus {
          transform: scale(${isTv ? 1.08 : 1.04});
          border-color: var(--ms-red, #E50914) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.6), 0 0 16px rgba(229, 9, 20, 0.4) !important;
          z-index: 10;
        }
      `}</style>
    </div>
  );
};
