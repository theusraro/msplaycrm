import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { defaultActivityThresholds } from '../../utils/activityCalculator';
import { useToast } from '../../contexts/ToastContext';
import { Settings, Sliders, Shield, Save, Clock, Info } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { success } = useToast();
  const [activeDays, setActiveDays] = useState(defaultActivityThresholds.activeDays);
  const [lowActivityDays, setLowActivityDays] = useState(defaultActivityThresholds.lowActivityDays);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('msplay_activity_thresholds', JSON.stringify({ activeDays, lowActivityDays }));
    success('Parâmetros de atividade salvos com sucesso!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Configurações do Sistema"
        subtitle="Gerencie regras operacionais de atividade, limites do CRM e preferências globais."
        icon={Settings}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSave} className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-[#121212] p-6 space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-red" /> Critérios de Detecção de Revendedores Parados
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Configure a quantidade de dias sem atendimento ou atividade para classificar automaticamente o revendedor como Ativo, Baixa Atividade ou Inativo.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-300 mb-1">
                Limite para status ATIVO (Máximo de dias desde última atividade):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={activeDays}
                  onChange={(e) => setActiveDays(Number(e.target.value))}
                  className="w-24 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white font-bold text-center focus:border-brand-red focus:outline-none"
                />
                <span className="text-zinc-400">dias (Padrão: 3 dias)</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">
                Limite para status BAIXA ATIVIDADE (Atividade recente entre):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={activeDays + 1}
                  max={60}
                  value={lowActivityDays}
                  onChange={(e) => setLowActivityDays(Number(e.target.value))}
                  className="w-24 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white font-bold text-center focus:border-brand-red focus:outline-none"
                />
                <span className="text-zinc-400">dias (Acima disso, classificado como Inativo/Parado)</span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800">
              <button
                type="submit"
                className="rounded-xl bg-brand-red hover:bg-brand-redHover px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-red/20 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Salvar Critérios
              </button>
            </div>
          </div>
        </form>

        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-[#121212] p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-red" /> Informações da Plataforma
          </h3>
          <div className="space-y-3 text-xs text-zinc-400">
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span>Sistema:</span>
              <span className="font-bold text-white">MSPLAY WhatsApp CRM</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span>Versão:</span>
              <span className="font-bold text-brand-red font-mono">v2.0 Pro</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span>Banco de Dados:</span>
              <span className="font-bold text-emerald-400 font-mono">Supabase PostgreSQL + RLS</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span>Proteção de APIs:</span>
              <span className="font-bold text-emerald-400 font-mono">Serverless Vercel Edge</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
