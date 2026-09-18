import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  return (
    <div className="bg-amber-500 text-zinc-950 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-md sticky top-0 z-50">
      <WifiOff className="w-4 h-4" />
      <span>Você está sem conexão com a internet. O CRM está em modo leitura offline.</span>
    </div>
  );
};

export const OfflineScreen: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/5 animate-pulse">
        <WifiOff className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">
        Sem Conexão com a Internet
      </h2>
      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mb-6">
        Não foi possível conectar aos servidores do MSPLAY CRM. Verifique seu Wi-Fi ou rede móvel para sincronizar seus dados.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2.5 rounded-xl bg-brand-red hover:bg-brand-redHover text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
      >
        <RefreshCw className="w-4 h-4" /> Tentar Reconectar
      </button>
    </div>
  );
};
