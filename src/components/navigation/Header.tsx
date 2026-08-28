import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useDeviceMode } from '../../hooks/useDeviceMode';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, isTv } = useDeviceMode();
  const { state, actions } = useAppStore();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { label: 'Início', path: '/home' },
    { label: 'TV', path: '/tv' },
    { label: 'Filmes', path: '/filmes' },
    { label: 'Séries', path: '/series' },
  ];

  const currentProfile = state.selectedProfile;

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--ms-header-height, 64px)',
      background: 'linear-gradient(to bottom, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.7) 60%, transparent 100%)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isTv ? '0 var(--ms-tv-safe-area, 48px)' : isMobile ? '0 16px' : '0 32px',
      transition: 'background 0.3s ease',
    }}>
      {/* Left: Brand & Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isTv ? '32px' : '24px' }}>
        <div 
          onClick={() => navigate('/home')}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <span style={{
            color: 'var(--ms-red, #E50914)',
            fontSize: isTv ? '1.8rem' : '1.5rem',
            fontWeight: 900,
            letterSpacing: '2px',
            fontFamily: 'var(--ms-font-family)',
            textShadow: '0 0 16px rgba(229, 9, 20, 0.4)',
          }}>
            MSPLAY
          </span>
        </div>

        {/* Desktop / TV Navigation Tabs */}
        {!isMobile && (
          <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {navLinks.map(link => {
              const isActive = location.pathname === link.path || (link.path === '/filmes' && location.pathname === '/movies');
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  tabIndex={0}
                  className="nav-link-btn"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? '#ffffff' : 'var(--ms-text-secondary, #B3B3B3)',
                    fontSize: isTv ? '1.1rem' : '0.95rem',
                    fontWeight: isActive ? 700 : 500,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  {link.label}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '16px',
                      right: '16px',
                      height: '2px',
                      background: 'var(--ms-red, #E50914)',
                      borderRadius: '2px',
                      boxShadow: '0 0 8px #E50914',
                    }} />
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right: Search, Favorites & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Search button */}
        <button
          onClick={() => navigate('/search')}
          tabIndex={0}
          aria-label="Buscar"
          className="header-icon-btn"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            width: isTv ? '44px' : '38px',
            height: isTv ? '44px' : '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            outline: 'none',
            fontSize: '1rem',
            transition: 'all 0.2s ease',
          }}
        >
          🔍
        </button>

        {/* Profile Avatar & Dropdown */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <div
            tabIndex={0}
            onClick={() => setProfileMenuOpen(prev => !prev)}
            onKeyDown={(e) => e.key === 'Enter' && setProfileMenuOpen(prev => !prev)}
            className="profile-badge-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              outline: 'none',
              padding: '4px 8px',
              borderRadius: '8px',
              background: profileMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: isTv ? '42px' : '36px',
              height: isTv ? '42px' : '36px',
              borderRadius: '8px',
              background: currentProfile?.color || 'linear-gradient(135deg, #e50914, #8b0000)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,255,255,0.2)',
            }}>
              {(currentProfile?.name || 'M').charAt(0).toUpperCase()}
            </div>
            {!isMobile && (
              <span style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 600 }}>
                {currentProfile?.name || 'Perfil'}
              </span>
            )}
            <span style={{ fontSize: '0.7rem', color: '#aaa', transform: profileMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              ▼
            </span>
          </div>

          {/* Profile Dropdown Menu */}
          {profileMenuOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '220px',
              background: '#181818',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '10px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
              overflow: 'hidden',
              zIndex: 1000,
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  {currentProfile?.name || 'Usuário MSPLAY'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ms-text-muted, #808080)', marginTop: '2px' }}>
                  Perfil Ativo
                </div>
              </div>

              <div style={{ padding: '6px' }}>
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    actions.setSelectedProfile(null);
                    navigate('/profiles');
                  }}
                  tabIndex={0}
                  className="menu-item-btn"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    outline: 'none',
                    textAlign: 'left',
                  }}
                >
                  <span>👥</span>
                  <span>Trocar Perfil</span>
                </button>

                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/favorites');
                  }}
                  tabIndex={0}
                  className="menu-item-btn"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    outline: 'none',
                    textAlign: 'left',
                  }}
                >
                  <span>❤️</span>
                  <span>Minha Lista</span>
                </button>

                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/settings');
                  }}
                  tabIndex={0}
                  className="menu-item-btn"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    outline: 'none',
                    textAlign: 'left',
                  }}
                >
                  <span>⚙️</span>
                  <span>Configurações</span>
                </button>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    actions.logout();
                    navigate('/login');
                  }}
                  tabIndex={0}
                  className="menu-item-btn destructive"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ms-red, #E50914)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    outline: 'none',
                    textAlign: 'left',
                  }}
                >
                  <span>🚪</span>
                  <span>Sair do MSPLAY</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .nav-link-btn:hover, .nav-link-btn:focus {
          color: #ffffff !important;
          background: rgba(255,255,255,0.06) !important;
        }
        .header-icon-btn:hover, .header-icon-btn:focus {
          background: rgba(255,255,255,0.18) !important;
          border-color: var(--ms-red, #E50914) !important;
          transform: scale(1.05);
        }
        .profile-badge-btn:hover, .profile-badge-btn:focus {
          background: rgba(255,255,255,0.12) !important;
        }
        .menu-item-btn:hover, .menu-item-btn:focus {
          background: rgba(255,255,255,0.1) !important;
        }
        .menu-item-btn.destructive:hover, .menu-item-btn.destructive:focus {
          background: rgba(229,9,20,0.15) !important;
        }
      `}</style>
    </header>
  );
};
