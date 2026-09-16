import React from 'react';
import { UserCheck, MessageSquare, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface FunnelData {
  novo: number;
  em_contato: number;
  pendente: number;
  concluido: number;
  perdido: number;
}

interface FunnelChartProps {
  data: FunnelData;
  totalLeads: number;
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ data, totalLeads }) => {
  const totalInFunnel = data.novo + data.em_contato + data.pendente + data.concluido + data.perdido;
  const baseCount = totalInFunnel > 0 ? totalInFunnel : 1;

  const stages = [
    {
      id: 'novo',
      label: 'Novo Lead',
      count: data.novo,
      icon: UserCheck,
      color: 'from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/30',
      barColor: 'bg-sky-500',
    },
    {
      id: 'em_contato',
      label: 'Em Contato',
      count: data.em_contato,
      icon: MessageSquare,
      color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/30',
      barColor: 'bg-indigo-500',
    },
    {
      id: 'pendente',
      label: 'Pendente / Proposta',
      count: data.pendente,
      icon: Clock,
      color: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30',
      barColor: 'bg-amber-500',
    },
    {
      id: 'concluido',
      label: 'Venda Concluída',
      count: data.concluido,
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30',
      barColor: 'bg-emerald-500',
    },
  ];

  const conversionRate = totalInFunnel > 0 ? ((data.concluido / totalInFunnel) * 100).toFixed(1) : '0.0';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Funil de Vendas Comercial</h3>
          <p className="text-xs text-zinc-400">Conversão por etapa em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">
            Taxa Geral: {conversionRate}%
          </span>
          {data.perdido > 0 && (
            <span className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {data.perdido} Perdidos
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3.5">
        {stages.map((stage, idx) => {
          const percent = ((stage.count / baseCount) * 100).toFixed(1);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 transition hover:border-zinc-700"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2 font-bold">
                  <div className={`p-1.5 rounded-lg border ${stage.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-zinc-200">{stage.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-white text-sm">{stage.count}</span>
                  <span className="text-zinc-400 font-semibold w-12 text-right">{percent}%</span>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${stage.barColor}`}
                  style={{ width: `${Math.max(Number(percent), stage.count > 0 ? 3 : 0)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
