import React from 'react';

export const SkeletonCard: React.FC<{ width?: string; height?: string }> = ({
  width = '160px',
  height = '240px',
}) => (
  <div style={{
    width,
    height,
    borderRadius: '8px',
    background: 'linear-gradient(110deg, #1a1a1a 30%, #242424 50%, #1a1a1a 70%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s linear infinite',
    flexShrink: 0,
  }} />
);

export const SkeletonRow: React.FC<{ count?: number; cardWidth?: string; cardHeight?: string }> = ({
  count = 6,
  cardWidth = '160px',
  cardHeight = '240px',
}) => (
  <div style={{ marginBottom: '32px' }}>
    <div style={{
      width: '120px',
      height: '20px',
      borderRadius: '4px',
      background: 'linear-gradient(110deg, #1a1a1a 30%, #242424 50%, #1a1a1a 70%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s linear infinite',
      marginBottom: '12px',
    }} />
    <div style={{ display: 'flex', gap: '12px', overflowX: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} width={cardWidth} height={cardHeight} />
      ))}
    </div>
  </div>
);

export const PageLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#FFFFFF',
  }}>
    <div style={{
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      marginBottom: '16px',
    }}>
      MSPLAY
    </div>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid #2a2a2a',
      borderTopColor: '#E50914',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  </div>
);
