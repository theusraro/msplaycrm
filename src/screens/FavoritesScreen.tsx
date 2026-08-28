import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { contentRepository } from '../services/contentRepository';
import { ContentItem } from '../types/content';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { Header } from '../components/navigation/Header';
import { BottomNav } from '../components/navigation/BottomNav';
import { ContentCard } from '../components/content/ContentCard';
import { EmptyState } from '../components/ui/EmptyState';

export default function FavoritesScreen() {
  const navigate = useNavigate();
  const { isMobile, isTv } = useDeviceMode();
  const { state } = useAppStore();

  const [favoriteItems, setFavoriteItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      setLoading(true);
      const allContent = await contentRepository.getAll();
      const favs = allContent.filter(item => state.favorites.includes(item.id));
      setFavoriteItems(favs);
      setLoading(false);
    }
    loadFavorites();
  }, [state.favorites]);

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
        maxWidth: 'var(--ms-content-max-width, 1400px)',
        margin: '0 auto',
        padding: isTv ? '0 var(--ms-tv-safe-area, 48px)' : isMobile ? '0 16px' : '0 32px',
      }}>
        {/* Title */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: isTv ? '2.4rem' : '1.8rem', fontWeight: 800, margin: '0 0 6px 0' }}>
            Minha Lista
          </h1>
          <span style={{ fontSize: '0.9rem', color: 'var(--ms-text-muted, #808080)' }}>
            Seus filmes, séries e canais favoritos salvos neste perfil
          </span>
        </div>

        {/* Favorites Grid or Empty State */}
        {favoriteItems.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: isTv ? '24px' : '16px',
          }}>
            {favoriteItems.map(item => (
              <ContentCard key={item.id} item={item} variant="poster" />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="❤️"
            title="Sua lista está vazia"
            description="Você ainda não adicionou nenhum filme ou série aos seus favoritos. Navegue pelo catálogo e clique em '+ Minha Lista'."
            actionLabel="Explorar Catálogo"
            onAction={() => navigate('/home')}
          />
        )}
      </div>

      {isMobile && <BottomNav />}
    </div>
  );
}
