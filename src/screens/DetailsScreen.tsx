import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentRepository } from '../services/contentRepository';
import { ContentItem, Season, Episode } from '../types/content';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/ui/Toast';
import { Header } from '../components/navigation/Header';
import { BottomNav } from '../components/navigation/BottomNav';
import { ContentRow } from '../components/content/ContentRow';

export default function DetailsScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile, isTv } = useDeviceMode();
  const { state, actions } = useAppStore();
  const { showToast } = useToast();

  const [item, setItem] = useState<ContentItem | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [related, setRelated] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadItem() {
      if (!id) return;
      setLoading(true);
      const found = await contentRepository.getById(id);
      if (found && isMounted) {
        setItem(found);
        setSelectedSeason(1);

        // Fetch related items by matching genre or type
        const allOfType = await contentRepository.getByType(found.type);
        const relatedItems = allOfType.filter(x => x.id !== found.id).slice(0, 8);
        setRelated(relatedItems);
        setLoading(false);
      }
    }
    loadItem();
    return () => { isMounted = false; };
  }, [id]);

  if (loading || !item) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--ms-bg, #0a0a0a)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid rgba(229,9,20,0.2)',
          borderTopColor: 'var(--ms-red, #E50914)',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  const isFavorite = state.favorites.includes(item.id);
  const currentProgress = state.watchProgress[item.id];

  const handleToggleFavorite = () => {
    actions.toggleFavorite(item.id);
    if (!isFavorite) {
      showToast(`"${item.title}" adicionado à Minha Lista`, 'success');
    } else {
      showToast(`"${item.title}" removido da Minha Lista`, 'info');
    }
  };

  const handleWatch = (episodeId?: string) => {
    if (episodeId) {
      navigate(`/player/${item.id}?episode=${episodeId}`);
    } else {
      navigate(`/player/${item.id}`);
    }
  };

  const isSeries = item.type === 'series';
  const seasons: Season[] = item.seasonsList || [];
  const currentSeasonData = seasons.find(s => s.seasonNumber === selectedSeason) || seasons[0];

  return (
    <div style={{
      backgroundColor: 'var(--ms-bg, #0a0a0a)',
      color: 'var(--ms-text, #ffffff)',
      minHeight: '100vh',
      paddingBottom: isMobile ? '80px' : '48px',
      overflowX: 'hidden',
    }}>
      <Header />

      {/* Hero Backdrop Section */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: isTv ? '65vh' : isMobile ? '45vh' : '60vh',
        minHeight: isMobile ? '320px' : '440px',
        backgroundImage: `url(${item.backdrop || item.coverImage || item.poster})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 20%',
      }}>
        {/* Dark Overlays */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: isMobile
            ? 'linear-gradient(to top, #0a0a0a 10%, rgba(10,10,10,0.6) 50%, rgba(10,10,10,0.2) 100%)'
            : 'linear-gradient(to right, #0a0a0a 25%, rgba(10,10,10,0.8) 60%, transparent 100%), linear-gradient(to top, #0a0a0a 0%, transparent 60%)',
        }} />

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          tabIndex={0}
          aria-label="Voltar"
          className="details-back-btn"
          style={{
            position: 'absolute',
            top: isMobile ? '72px' : '84px',
            left: isTv ? 'var(--ms-tv-safe-area, 48px)' : isMobile ? '16px' : '32px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(10,10,10,0.8)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            fontSize: '1.2rem',
            outline: 'none',
            transition: 'all 0.2s ease',
          }}
        >
          ‹
        </button>

        {/* Content on Desktop/TV */}
        {!isMobile && (
          <div style={{
            position: 'absolute',
            bottom: '32px',
            left: isTv ? 'var(--ms-tv-safe-area, 48px)' : '32px',
            maxWidth: '650px',
            zIndex: 5,
          }}>
            <h1 style={{
              fontSize: isTv ? '3.2rem' : '2.5rem',
              fontWeight: 900,
              marginBottom: '12px',
              textShadow: '0 4px 16px rgba(0,0,0,0.8)',
            }}>
              {item.title}
            </h1>

            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', fontSize: '0.9rem', color: '#b3b3b3' }}>
              <span style={{ color: '#46d369', fontWeight: 700 }}>98% Relevante</span>
              <span>•</span>
              <span style={{ border: '1px solid rgba(255,255,255,0.3)', padding: '1px 6px', borderRadius: '3px', color: '#ffffff', fontWeight: 600, fontSize: '0.75rem' }}>
                {item.rating || '14'}
              </span>
              <span>•</span>
              <span>{item.year}</span>
              <span>•</span>
              <span>{item.duration || (isSeries ? `${item.seasons || 1} Temporadas` : '2h 10min')}</span>
            </div>

            {/* Genres */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(item.genres || ['Ficção Científica', 'Suspense']).map(g => (
                <span key={g} style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  color: '#ffffff',
                }}>
                  {g}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleWatch()}
                tabIndex={0}
                className="details-action-btn primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--ms-red, #E50914)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 4px 16px rgba(229,9,20,0.4)',
                }}
              >
                <span>▶</span>
                <span>{currentProgress ? 'Continuar Assistindo' : 'Assistir'}</span>
              </button>

              <button
                onClick={handleToggleFavorite}
                tabIndex={0}
                className="details-action-btn secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isFavorite ? 'rgba(229,9,20,0.2)' : 'rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  border: isFavorite ? '1px solid var(--ms-red, #E50914)' : '1px solid rgba(255,255,255,0.2)',
                  padding: '12px 22px',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <span>{isFavorite ? '✓' : '+'}</span>
                <span>{isFavorite ? 'Na Minha Lista' : 'Minha Lista'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Details Body */}
      <div style={{
        maxWidth: 'var(--ms-content-max-width, 1400px)',
        margin: '0 auto',
        padding: isTv ? '24px var(--ms-tv-safe-area, 48px)' : isMobile ? '16px' : '32px',
      }}>
        {/* Mobile Info Header */}
        {isMobile && (
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>
              {item.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.8rem', color: '#aaa' }}>
              <span style={{ color: '#46d369', fontWeight: 700 }}>98% Relevante</span>
              <span>•</span>
              <span>{item.year}</span>
              <span>•</span>
              <span>{item.rating}</span>
              <span>•</span>
              <span>{item.duration}</span>
            </div>
            
            {/* Mobile Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => handleWatch()}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--ms-red, #E50914)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <span>▶</span>
                <span>{currentProgress ? 'Continuar Assistindo' : 'Assistir'}</span>
              </button>

              <button
                onClick={handleToggleFavorite}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isFavorite ? 'rgba(229,9,20,0.2)' : 'rgba(255,255,255,0.1)',
                  border: isFavorite ? '1px solid var(--ms-red, #E50914)' : '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <span>{isFavorite ? '✓' : '+'}</span>
                <span>{isFavorite ? 'Na Minha Lista' : 'Minha Lista'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Synopsis & Overview */}
        <div style={{ maxWidth: '800px', marginBottom: '40px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ms-text-muted, #808080)', marginBottom: '8px' }}>
            SINOPSE
          </h3>
          <p style={{
            fontSize: isTv ? '1.15rem' : '1rem',
            lineHeight: 1.6,
            color: 'var(--ms-text-secondary, #B3B3B3)',
          }}>
            {item.description}
          </p>
        </div>

        {/* Series Episodes Section */}
        {isSeries && seasons.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            {/* Season Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Episódios</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {seasons.map(s => (
                  <button
                    key={s.seasonNumber}
                    onClick={() => setSelectedSeason(s.seasonNumber)}
                    tabIndex={0}
                    style={{
                      background: selectedSeason === s.seasonNumber ? 'var(--ms-red, #E50914)' : 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '6px 16px',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: selectedSeason === s.seasonNumber ? 700 : 500,
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Episodes List Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {(currentSeasonData?.episodes || []).map((ep: Episode) => (
                <div
                  key={ep.id}
                  tabIndex={0}
                  onClick={() => handleWatch(ep.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleWatch(ep.id)}
                  className="episode-card"
                  style={{
                    background: '#141414',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '140px',
                    backgroundImage: `url(${ep.thumbnail})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}>
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: '#fff',
                    }}>
                      {ep.duration}
                    </div>
                  </div>

                  <div style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                        {ep.title}
                      </h4>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: 'var(--ms-text-muted, #808080)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {ep.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Items Row */}
        {related.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <ContentRow title="Títulos Relacionados" items={related} variant="poster" />
          </div>
        )}
      </div>

      {isMobile && <BottomNav />}

      <style>{`
        .details-back-btn:hover, .details-back-btn:focus {
          background: var(--ms-red, #E50914) !important;
          border-color: var(--ms-red, #E50914) !important;
          transform: scale(1.08);
        }
        .details-action-btn.primary:hover, .details-action-btn.primary:focus {
          background: #f6121d !important;
          transform: scale(1.04);
        }
        .details-action-btn.secondary:hover, .details-action-btn.secondary:focus {
          background: rgba(255,255,255,0.2) !important;
          transform: scale(1.04);
        }
        .episode-card:hover, .episode-card:focus {
          border-color: var(--ms-red, #E50914) !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.6);
        }
      `}</style>
    </div>
  );
}