import React from 'react';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<Props> = ({ icon = '📭', title, description, actionLabel, onAction }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.6 }}>{icon}</div>
    <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#FFFFFF', fontWeight: 600 }}>{title}</h3>
    {description && (
      <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#808080', maxWidth: '300px', lineHeight: 1.5 }}>
        {description}
      </p>
    )}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        style={{
          padding: '10px 24px',
          background: '#E50914',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {actionLabel}
      </button>
    )}
  </div>
);
