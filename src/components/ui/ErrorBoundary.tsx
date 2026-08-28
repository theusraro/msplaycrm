import React from 'react';

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MSPLAY Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0a0a0a',
          color: '#FFFFFF',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px' }}>Algo deu errado.</h1>
          <p style={{ fontSize: '0.875rem', color: '#808080', margin: '0 0 24px' }}>
            Ocorreu um erro inesperado.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.href = '/home';
            }}
            style={{
              padding: '12px 24px',
              background: '#E50914',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Voltar ao início
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
