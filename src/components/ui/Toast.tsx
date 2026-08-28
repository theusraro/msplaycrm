import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const bgColors = {
    success: '#1a472a',
    error: '#5c1a1a',
    info: '#1a2d47',
  };

  const borderColors = {
    success: '#2d8a4e',
    error: '#E50914',
    info: '#3b82f6',
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        padding: '12px 20px',
        borderRadius: '8px',
        background: bgColors[toast.type],
        border: `1px solid ${borderColors[toast.type]}`,
        color: '#FFFFFF',
        fontSize: '0.875rem',
        fontFamily: 'var(--ms-font-family, system-ui)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease',
        maxWidth: '320px',
        cursor: 'pointer',
      }}
      onClick={() => {
        setVisible(false);
        setTimeout(() => onRemove(toast.id), 300);
      }}
    >
      {toast.message}
    </div>
  );
};
