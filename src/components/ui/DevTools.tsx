import React, { useState, useEffect } from 'react';
import { useDeviceMode } from '../../hooks/useDeviceMode.tsx';

/**
 * DevTools overlay - only visible in development mode.
 * Shows device mode, resolution, and focused element info.
 */
export const DevTools: React.FC = () => {
  const { deviceMode } = useDeviceMode();
  const [resolution, setResolution] = useState('');
  const [focusedEl, setFocusedEl] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (import.meta.env.PROD) return;

    const updateResolution = () => {
      setResolution(`${window.innerWidth}×${window.innerHeight}`);
    };

    const updateFocus = () => {
      const el = document.activeElement;
      if (el) {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : '';
        setFocusedEl(`${tag}${id}${cls}`);
      }
    };

    updateResolution();
    window.addEventListener('resize', updateResolution);
    document.addEventListener('focusin', updateFocus);

    return () => {
      window.removeEventListener('resize', updateResolution);
      document.removeEventListener('focusin', updateFocus);
    };
  }, []);

  // Don't render in production
  if (import.meta.env.PROD) return null;

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed',
          bottom: '8px',
          right: '8px',
          zIndex: 9999,
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'rgba(229, 9, 20, 0.6)',
          border: 'none',
          color: '#fff',
          fontSize: '10px',
          cursor: 'pointer',
          opacity: 0.4,
        }}
        title="MSPLAY DevTools"
      >
        D
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '8px',
        right: '8px',
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.85)',
        border: '1px solid rgba(229, 9, 20, 0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#B3B3B3',
        lineHeight: 1.6,
        minWidth: '160px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ color: '#E50914', fontWeight: 'bold' }}>MSPLAY DEV</span>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#808080',
            cursor: 'pointer',
            fontSize: '14px',
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
      <div>Mode: <span style={{ color: '#fff' }}>{deviceMode}</span></div>
      <div>Res: <span style={{ color: '#fff' }}>{resolution}</span></div>
      <div>Focus: <span style={{ color: '#fff' }}>{focusedEl || '(none)'}</span></div>
    </div>
  );
};

export default DevTools;
