import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: 'Início', path: '/home', icon: '🏠' },
    { label: 'TV', path: '/tv', icon: '📺' },
    { label: 'Filmes', path: '/filmes', icon: '🎬' },
    { label: 'Séries', path: '/series', icon: '🍿' },
    { label: 'Perfil', path: '/profile', icon: '👤' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'var(--ms-bottom-nav-height, 64px)',
      background: 'rgba(12, 12, 12, 0.95)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path || (tab.path === '/filmes' && location.pathname === '/movies');
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              color: isActive ? 'var(--ms-red, #E50914)' : 'var(--ms-text-muted, #808080)',
              fontSize: '0.75rem',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              outline: 'none',
              flex: 1,
              height: '100%',
              transition: 'color 0.2s ease',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
