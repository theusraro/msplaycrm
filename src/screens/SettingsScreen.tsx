import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/ui/Toast';
import { Header } from '../components/navigation/Header';
import { BottomNav } from '../components/navigation/BottomNav';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { isTv, isMobile, deviceMode } = useDeviceMode();
  const { state, actions } = useAppStore();
  const { showToast } = useToast();

  const [toggles, setToggles] = useState({
    autoplay: state.settings.autoplayPreview,
    reduceAnimations: state.settings.reduceMotion,
    showProgress: state.settings.showProgress,
  });

  const handleToggle = (key: keyof typeof toggles) => {
    const updated = !toggles[key];
    setToggles(prev => ({ ...prev, [key]: updated }));
    if (key === 'autoplay') actions.updateSettings({ autoplayPreview: updated });
    if (key === 'reduceAnimations') actions.updateSettings({ reduceMotion: updated });
    if (key === 'showProgress') actions.updateSettings({ showProgress: updated });
  };

  const handleClearHistory = () => {
    actions.clearHistory();
    actions.clearWatchProgress();
    showToast('Histórico e progresso de reprodução limpos com sucesso!', 'success');
  };

  const handleClearFavorites = () => {
    actions.clearFavorites();
    showToast('Minha Lista de favoritos foi limpa.', 'info');
  };

  const handleResetDemo = () => {
    actions.resetDemo();
    showToast('Dados de demonstração restaurados para o padrão.', 'success');
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => e.key === 'Enter' && onChange()}
      style={{
        width: '48px',
        height: '26px',
        backgroundColor: checked ? 'var(--ms-red, #e50914)' : '#333',
        borderRadius: '13px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        outline: 'none',
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '50%',
        position: 'absolute',
        top: '3px',
        left: checked ? '25px' : '3px',
        transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
      }} />
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: '1rem', color: 'var(--ms-text-muted, #808080)', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
        {title}
      </h2>
      <div style={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );

  const Row = ({ label, description, control, noBorder }: { label: string; description?: string; control: React.ReactNode; noBorder?: boolean }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: noBorder ? 'none' : '1px solid rgba(255,255,255,0.06)',
      gap: '16px',
    }}>
      <div>
        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#ffffff' }}>{label}</div>
        {description && <div style={{ fontSize: '0.8rem', color: 'var(--ms-text-muted, #808080)', marginTop: '2px' }}>{description}</div>}
      </div>
      {control}
    </div>
  );

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
        {/* Header Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <button
            onClick={() => navigate(-1)}
            tabIndex={0}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#ffffff',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ‹
          </button>
          <h1 style={{ margin: 0, fontSize: isTv ? '2rem' : '1.6rem', fontWeight: 800 }}>Configurações</h1>
        </div>

        {/* Playback Section */}
        <Section title="Reprodução & Mídia">
          <Row
            label="Autoplay de Prévias"
            description="Reproduz automaticamente trailers no HeroBanner"
            control={<ToggleSwitch checked={toggles.autoplay} onChange={() => handleToggle('autoplay')} />}
          />
          <Row
            label="Mostrar Barras de Progresso"
            description="Exibe indicador de tempo assistido nos cards"
            noBorder
            control={<ToggleSwitch checked={toggles.showProgress} onChange={() => handleToggle('showProgress')} />}
          />
        </Section>

        {/* Accessibility & Motion */}
        <Section title="Acessibilidade & Interface">
          <Row
            label="Reduzir Animações"
            description="Otimiza performance em dispositivos e Smart TVs modestas"
            noBorder
            control={<ToggleSwitch checked={toggles.reduceAnimations} onChange={() => handleToggle('reduceAnimations')} />}
          />
        </Section>

        {/* Data & Storage */}
        <Section title="Armazenamento Local (Mock)">
          <Row
            label="Limpar Histórico de Reprodução"
            control={
              <button
                onClick={handleClearHistory}
                tabIndex={0}
                style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Limpar
              </button>
            }
          />
          <Row
            label="Limpar Minha Lista de Favoritos"
            control={
              <button
                onClick={handleClearFavorites}
                tabIndex={0}
                style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Limpar
              </button>
            }
          />
          <Row
            label="Resetar Demonstração (Padrão de Fábrica)"
            noBorder
            control={
              <button
                onClick={handleResetDemo}
                tabIndex={0}
                style={{ background: 'transparent', border: '1px solid var(--ms-red, #e50914)', color: 'var(--ms-red, #e50914)', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                Restaurar
              </button>
            }
          />
        </Section>

        {/* About App */}
        <Section title="Sobre o MSPLAY">
          <div style={{ padding: '16px 20px', color: 'var(--ms-text-secondary, #B3B3B3)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, color: '#ffffff' }}>MSPLAY Streaming Demo v2.5.0</div>
            <div>Modo Ativo: <strong style={{ color: 'var(--ms-red, #e50914)' }}>{deviceMode.toUpperCase()}</strong></div>
            <div>Catálogo Local: 30 Filmes • 20 Séries • 16 Canais Ao Vivo</div>
            <div>Design System & Tokens: Dark / Carmine Red / Inter 4K</div>
          </div>
        </Section>
      </div>

      {isMobile && <BottomNav />}
    </div>
  );
}