import React from 'react';
import { LeadStatus, ResellerActivityStatus, ResellerAdminStatus } from '../../types';

interface StatusBadgeProps {
  type: 'lead' | 'activity' | 'admin' | 'sale' | 'custom';
  value: string;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  value,
  label,
  size = 'sm',
}) => {
  let colorClasses = 'bg-zinc-800 text-zinc-300 border-zinc-700';
  let displayLabel = label || value;

  if (type === 'lead') {
    const status = value as LeadStatus;
    switch (status) {
      case 'novo':
        colorClasses = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
        displayLabel = label || 'Novo Lead';
        break;
      case 'em_contato':
        colorClasses = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
        displayLabel = label || 'Em Contato';
        break;
      case 'pendente':
        colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        displayLabel = label || 'Pendente';
        break;
      case 'concluido':
        colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        displayLabel = label || 'Venda Concluída';
        break;
      case 'perdido':
        colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
        displayLabel = label || 'Perdido';
        break;
    }
  } else if (type === 'activity') {
    const status = value as ResellerActivityStatus;
    switch (status) {
      case 'ativo':
        colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        displayLabel = label || 'Ativo';
        break;
      case 'baixa_atividade':
        colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        displayLabel = label || 'Baixa Atividade';
        break;
      case 'inativo':
        colorClasses = 'bg-zinc-700/30 text-zinc-400 border-zinc-600/40';
        displayLabel = label || 'Inativo (Parado)';
        break;
    }
  } else if (type === 'admin') {
    const status = value as ResellerAdminStatus;
    switch (status) {
      case 'ativo':
        colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        displayLabel = label || 'Liberado';
        break;
      case 'suspenso':
        colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
        displayLabel = label || 'Suspenso';
        break;
    }
  } else if (type === 'sale') {
    switch (value) {
      case 'concluido':
        colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        displayLabel = label || 'Aprovada';
        break;
      case 'cancelado':
        colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
        displayLabel = label || 'Cancelada';
        break;
      case 'reembolsado':
        colorClasses = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
        displayLabel = label || 'Reembolsada';
        break;
    }
  }

  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={"inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide capitalize  "}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {displayLabel}
    </span>
  );
};

