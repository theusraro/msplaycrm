import React from 'react';
import { UserCheck, MessageSquare, Clock, CheckCircle2, XCircle } from 'lucide-react';

export interface FunnelStage {
  label: string;
  count: number;
  color?: string;
}

export interface FunnelChartProps {
  stages?: FunnelStage[];
  data?: {
    novo: number;
    em_contato: number;
    pendente: number;
    concluido: number;
    perdido: number;
  };
  totalLeads?: number;
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ stages: propStages, data, totalLeads }) => {
  let displayStages: { id: string; label: string; count: number; icon: any; color: string; barColor: string }[] = [];

  if (propStages && propStages.length > 0) {
    const icons = [UserCheck, MessageSquare, Clock, CheckCircle2, XCircle];
    const colors = [
      'from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/30',
      'from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/30',
      'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30',
      'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30',
    ];
    const barColors = ['bg-sky-500', 'bg-indigo-500', 'bg-amber-500', 'bg-emerald-500'];

    displayStages = propStages.map((st, i) => ({
      id: `stage-${i}`,
      label: st.label,
      count: st.count,
      icon: icons[i % icons.length],
      color: colors[i % colors.length],
      barColor: barColors[i % barColors.length],
    }));
  } else if (data) {
    displayStages = [
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
  }

  const baseCount = Math.max(...displayStages.map((s) => s.count), 1);
  const firstCount = displayStages[0]?.count || 1;
  const lastCount = displayStages[displayStages.length - 1]?.count || 0;
  const conversionRate = firstCount > 0 ? ((lastCount / firstCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="rounded-2xl border border-brand-lightBorder dark:border-zinc-800 bg-white dark:bg-[#121212] p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Funil de Vendas Comercial</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Conversão por etapa em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-500 dark:text-emerald-400">
            Taxa Geral: {conversionRate}%
          </span>
        </div>
      </div>

      <div className="space-y-3.5">
        {displayStages.map((stage) => {
          const percent = ((stage.count / baseCount) * 100).toFixed(1);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className="relative overflow-hidden rounded-xl border border-brand-lightBorder dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/40 p-3.5 transition hover:border-brand-red/30 dark:hover:border-zinc-700"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2 font-bold">
                  <div className={`p-1.5 rounded-lg border ${stage.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-slate-800 dark:text-zinc-200">{stage.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-900 dark:text-white text-sm">{stage.count}</span>
                  <span className="text-slate-500 dark:text-zinc-400 font-semibold w-12 text-right">{percent}%</span>
                </div>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
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
