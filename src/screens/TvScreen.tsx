import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentRepository } from '../services/contentRepository';
import { TvChannel, Program } from '../types/content';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { Header } from '../components/navigation/Header';
import { BottomNav } from '../components/navigation/BottomNav';

export default function TvScreen() {
  const navigate = useNavigate();
  const { isMobile, isTv } = useDeviceMode();
  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<TvChannel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  useEffect(() => {
    contentRepository.getChannels().then(ch => {
      setChannels(ch);
      if (ch.length > 0) setSelectedChannel(ch[0]);
    });
  }, []);

  const categories = ['Todos', 'Notícias', 'Esportes', 'Entretenimento', 'Documentários', 'Infantil', 'Abertos'];

  const filteredChannels = channels.filter(c => {
    if (selectedCategory === 'Todos') return true;
    return c.category === selectedCategory;
  });

  const handleWatch = (channelId: string) => {
    navigate(`/player/${channelId}`);
  };

  return (
    <div style={{
      backgroundColor: 'var(--ms-bg, #0a0a0a)',
      color: 'var(--ms-text, #ffffff)',
      minHeight: '100vh',
      paddingTop: '72px',
      paddingBottom: isMobile ? '80px' : '32px',
      overflowX: 'hidden',
    }}>
      <Header />

      <div style={{
        maxWidth: 'var(--ms-content-max-width, 1400px)',
        margin: '0 auto',
        padding: isTv ? '0 var(--ms-tv-safe-area, 48px)' : isMobile ? '0 16px' : '0 32px',
      }}>
        {/* Category Selector */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '16px',
          marginBottom: '16px',
        }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              tabIndex={0}
              style={{
                background: selectedCategory === cat ? 'var(--ms-red, #E50914)' : 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '16px',
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

        {/* TV Split Screen Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '360px 1fr',
          gap: '24px',
          alignItems: 'start',
        }}>
          {/* Left Column: Channels List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: isMobile ? 'auto' : 'calc(100vh - 180px)',
            overflowY: isMobile ? 'visible' : 'auto',
            paddingRight: isMobile ? '0' : '8px',
          }}>
            {filteredChannels.map(channel => {
              const isSelected = selectedChannel?.id === channel.id;
              return (
                <div
                  key={channel.id}
                  tabIndex={0}
                  onClick={() => setSelectedChannel(channel)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedChannel(channel)}
                  onDoubleClick={() => handleWatch(channel.id)}
                  className="tv-channel-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 14px',
                    background: isSelected ? 'rgba(229,9,20,0.15)' : '#141414',
                    border: isSelected ? '1px solid var(--ms-red, #E50914)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Channel Logo */}
                  <div style={{
                    width: '64px',
                    height: '44px',
                    borderRadius: '6px',
                    backgroundImage: `url(${channel.logo})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }} />

                  {/* Channel Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{
                        background: 'var(--ms-red, #E50914)',
                        color: '#fff',
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        padding: '1px 4px',
                        borderRadius: '3px',
                      }}>
                        AO VIVO
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {channel.name}
                      </h4>
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      color: isSelected ? '#ffffff' : 'var(--ms-text-secondary, #B3B3B3)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {channel.programNow}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: EPG Schedule & Live Player Preview */}
          {selectedChannel && (
            <div style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: isTv ? '28px' : '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              {/* Channel Header Banner */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: '16px',
                paddingBottom: '20px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '80px',
                    height: '54px',
                    borderRadius: '8px',
                    backgroundImage: `url(${selectedChannel.logo})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{selectedChannel.name}</h2>
                    <span style={{ fontSize: '0.85rem', color: 'var(--ms-text-muted, #808080)' }}>
                      Categoria: {selectedChannel.category} • Full HD 1080p
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleWatch(selectedChannel.id)}
                  tabIndex={0}
                  style={{
                    background: 'var(--ms-red, #E50914)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(229,9,20,0.4)',
                    outline: 'none',
                  }}
                >
                  <span>▶</span>
                  <span>Assistir Ao Vivo</span>
                </button>
              </div>

              {/* Current Program Spotlight */}
              <div style={{
                background: 'rgba(229,9,20,0.08)',
                border: '1px solid rgba(229,9,20,0.3)',
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '24px',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--ms-red, #E50914)', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>
                  TRANSMITINDO AGORA
                </div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>
                  {selectedChannel.programNow}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ms-text-secondary, #B3B3B3)' }}>
                  A seguir: {selectedChannel.programNext}
                </p>
              </div>

              {/* Detailed EPG Program Guide Timeline */}
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
                Guia de Programação (EPG)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(selectedChannel.schedule || []).map((prog: Program, idx: number) => {
                  const isCurrent = idx === 1;
                  return (
                    <div
                      key={prog.id}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '12px 14px',
                        background: isCurrent ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        borderLeft: isCurrent ? '3px solid var(--ms-red, #E50914)' : '3px solid transparent',
                      }}
                    >
                      <div style={{
                        width: '80px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: isCurrent ? 'var(--ms-red, #E50914)' : 'var(--ms-text-muted, #808080)',
                        flexShrink: 0,
                      }}>
                        {prog.startTime}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginBottom: '2px' }}>
                          {prog.title}
                        </div>
                        {prog.description && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--ms-text-muted, #808080)' }}>
                            {prog.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile && <BottomNav />}

      <style>{`
        .tv-channel-item:hover, .tv-channel-item:focus {
          border-color: var(--ms-red, #E50914) !important;
          transform: translateX(4px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
}