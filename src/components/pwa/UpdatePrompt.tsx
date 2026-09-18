import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export const UpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('SW Registrado:', swUrl);
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // Checar atualizações a cada hora
      }
    },
    onRegisterError(error) {
      console.error('Erro no registro do SW:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm w-full animate-in slide-in-from-bottom-3 duration-300">
      <div className="bg-zinc-950 border border-brand-red/40 p-4 rounded-2xl shadow-2xl shadow-black/80 flex items-start justify-between gap-3 text-white">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-brand-red/10 text-brand-red shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Nova versão do MSPLAY disponível</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Atualize agora para receber as últimas melhorias e correções.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => updateServiceWorker(true)}
                className="px-3 py-1.5 rounded-xl bg-brand-red hover:bg-brand-redHover text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar agora
              </button>
              <button
                onClick={() => setNeedRefresh(false)}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white font-medium text-xs transition"
              >
                Depois
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setNeedRefresh(false)}
          className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
