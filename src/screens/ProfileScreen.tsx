import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { useAppStore } from '../store/useAppStore';
import { Header } from '../components/navigation/Header';
import { BottomNav } from '../components/navigation/BottomNav';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { isTv, isMobile, deviceMode } = useDeviceMode();
  const { state, actions } = useAppStore();

  const currentProfile = state.selectedProfile || {
    id: '1',
    name: 'Matheus',
    color: 'linear-gradient(135deg, #e50914, #8b0000)',
  };

  const options = [
    { icon: '👥', label: 'Trocar de Perfil', action: () => { actions.setSelectedProfile(null); navigate('/profiles'); } },
    { icon: '❤️', label: 'Minha Lista & Favoritos', action: () => navigate('/favorites') },
    { icon: '⚙️', label: 'Configurações do Aplicativo', action: () => navigate('/settings') },
    { icon: '🛠️', label: 'Showcase de Componentes (Dev)', action: () => navigate('/dev/showcase') },
    { icon: '🚪', label: 'Sair da Conta (Logout)', action: () => { actions.logout(); navigate('/login'); }, destructive: true },
  ];

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
        maxWidth: '650px',
        margin: '0 auto',
        padding: isTv ? '0 var(--ms-tv-safe-area, 48px)' : isMobile ? '0 16px' : '0 32px',
      }}>
        {/* Profile Card Center */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '36px',
          paddingTop: '16px',
        }}>
          <div style={{
            width: '110px',
            height: '110px',
            borderRadius: '16px',
            background: currentProfile.color || 'linear-gradient(135deg, #e50914, #8b0000)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(229, 9, 20, 0.3)',
            border: '2px solid rgba(255,255,255,0.2)',
          }}>
            {currentProfile.name.charAt(0).toUpperCase()}
          </div>

          <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: 800 }}>
            {currentProfile.name}
          </h1>

          <div style={{
            backgroundColor: '#161616',
            padding: '4px 14px',
            borderRadius: '16px',
            fontSize: '0.8rem',
            color: 'var(--ms-text-muted, #808080)',
            border: '1px solid #333',
          }}>
            Dispositivo: {deviceMode.toUpperCase()} • MSPLAY Premium
          </div>
        </div>

        {/* Options List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={opt.action}
              tabIndex={0}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: '#141414',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                color: opt.destructive ? 'var(--ms-red, #e50914)' : '#ffffff',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease',
                textAlign: 'left',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--ms-red, #e50914)';
                e.currentTarget.style.backgroundColor = '#1f1f1f';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.backgroundColor = '#141414';
                e.currentTarget.style.transform = 'none';
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1f1f1f';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#141414';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                <span style={{ fontSize: '1rem', fontWeight: opt.destructive ? 700 : 500 }}>
                  {opt.label}
                </span>
              </div>
              <span style={{ color: '#666', fontSize: '1.2rem' }}>›</span>
            </button>
          ))}
        </div>
      </div>

      {isMobile && <BottomNav />}
    </div>
  );
}