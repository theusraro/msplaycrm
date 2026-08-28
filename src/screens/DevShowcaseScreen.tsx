import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { SkeletonCard, SkeletonRow } from '../components/ui/SkeletonCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ContentCard } from '../components/content/ContentCard';
import { mockContent, mockChannels } from '../mocks';
import { useDeviceMode } from '../hooks/useDeviceMode';

export default function DevShowcaseScreen() {
  const navigate = useNavigate();
  const { isTv, isMobile, deviceMode } = useDeviceMode();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [testInput, setTestInput] = useState('');

  const sampleMovie = mockContent.find(i => i.type === 'movie') || mockContent[0];
  const sampleSeries = mockContent.find(i => i.type === 'series') || mockContent[1];
  const sampleChannel = mockChannels[0];

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh',
      padding: '40px 32px 80px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'var(--ms-font-family, sans-serif)',
    }}>
      {/* Dev Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #222', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--ms-red, #E50914)', fontSize: '2rem', fontWeight: 900 }}>
            MSPLAY Dev Showcase
          </h1>
          <span style={{ fontSize: '0.9rem', color: '#888' }}>
            Galeria de Componentes, Tokens e Design System (Modo Atual: {deviceMode.toUpperCase()})
          </span>
        </div>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: '#222',
            border: '1px solid #444',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Voltar para Home
        </button>
      </div>

      {/* 1. Buttons */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', borderLeft: '3px solid #E50914', paddingLeft: '10px', marginBottom: '16px' }}>
          1. Botões & Ações
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <button style={{ background: '#E50914', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            ▶ Assistir (Primary)
          </button>
          <button style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            + Minha Lista (Secondary)
          </button>
          <button style={{ background: 'transparent', color: '#888', border: '1px solid #333', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}>
            Cancelar (Ghost)
          </button>
          <button style={{ background: '#8b0000', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            Excluir (Destructive)
          </button>
        </div>
      </section>

      {/* 2. Toasts */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', borderLeft: '3px solid #E50914', paddingLeft: '10px', marginBottom: '16px' }}>
          2. Toasts Interativos
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => showToast('Adicionado à Minha Lista com sucesso!', 'success')} style={{ background: '#1a472a', border: '1px solid #2d8a4e', color: '#fff', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer' }}>
            Toast Sucesso
          </button>
          <button onClick={() => showToast('Removido da Minha Lista', 'info')} style={{ background: '#1a2d47', border: '1px solid #3b82f6', color: '#fff', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer' }}>
            Toast Info
          </button>
          <button onClick={() => showToast('Erro ao processar ação local', 'error')} style={{ background: '#5c1a1a', border: '1px solid #E50914', color: '#fff', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer' }}>
            Toast Erro
          </button>
        </div>
      </section>

      {/* 3. Cards & Focus */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', borderLeft: '3px solid #E50914', paddingLeft: '10px', marginBottom: '16px' }}>
          3. Content Cards (Poster, Wide com Progresso e TV Ao Vivo)
        </h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {sampleMovie && (
            <div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '6px' }}>Poster Vertical</div>
              <ContentCard item={sampleMovie} variant="poster" />
            </div>
          )}

          {sampleSeries && (
            <div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '6px' }}>Wide (Continue Assistindo 65%)</div>
              <ContentCard item={sampleSeries} variant="wide" progress={0.65} />
            </div>
          )}

          {sampleChannel && (
            <div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '6px' }}>Canal TV com Badge "AO VIVO"</div>
              <ContentCard
                item={{
                  id: sampleChannel.id,
                  title: sampleChannel.name,
                  type: 'tv',
                  year: 2026,
                  rating: 'L',
                  duration: 'AO VIVO',
                  logo: sampleChannel.logo,
                  programNow: sampleChannel.programNow,
                  isLive: true,
                }}
                variant="channel"
              />
            </div>
          )}
        </div>
      </section>

      {/* 4. Skeletons */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', borderLeft: '3px solid #E50914', paddingLeft: '10px', marginBottom: '16px' }}>
          4. Skeletons & Shimmer Loading
        </h2>
        <SkeletonRow title="Carregando Carrossel..." count={4} />
      </section>

      {/* 5. Modal Trigger */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', borderLeft: '3px solid #E50914', paddingLeft: '10px', marginBottom: '16px' }}>
          5. Modal Nativo
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}
        >
          Abrir Modal de Demonstração
        </button>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Modal de Teste MSPLAY">
          <p style={{ color: '#ccc', lineHeight: 1.5, marginBottom: '20px' }}>
            Este modal possui suporte nativo para teclado (Escape/Enter), foco seguro e animação suave em TV e Mobile.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: '1px solid #666', color: '#fff', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
              Fechar
            </button>
            <button onClick={() => setModalOpen(false)} style={{ background: '#E50914', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>
              Confirmar
            </button>
          </div>
        </Modal>
      </section>

      {/* 6. Empty State */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', borderLeft: '3px solid #E50914', paddingLeft: '10px', marginBottom: '16px' }}>
          6. Empty State
        </h2>
        <div style={{ background: '#141414', borderRadius: '12px', padding: '16px' }}>
          <EmptyState
            icon="🎬"
            title="Nenhum item disponível"
            description="Exemplo de mensagem quando um filtro ou busca não encontra resultados."
            actionLabel="Recarregar"
            onAction={() => showToast('Ação executada no Empty State')}
          />
        </div>
      </section>
    </div>
  );
}
