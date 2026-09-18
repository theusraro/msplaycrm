import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('⚠️ [MSPLAY CRM - ErrorBoundary] Erro não capturado:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-white mb-2">Erro de Renderização</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Ocorreu um erro inesperado ao renderizar esta tela.
            </p>
            {this.state.error && (
              <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl text-left text-[11px] font-mono text-red-400 mb-4 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" /> Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
