import React from 'react';
import { LeadStatus, ResellerActivityStatus, ResellerAdminStatus } from '../../types';

export interface StatusBadgeProps {
  type?: 'lead' | 'activity' | 'admin' | 'sale' | 'custom';
  status?: string;
  value?: string;
  label?: string;
  text?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type = 'custom',
  status,
  value,
  label,
  text,
  size = 'sm',
}) => {
  const actualValue = (status || value || 'default').toLowerCase();
  let displayLabel = text || label || actualValue;
  let colorClasses = 'bg-zinc-800 text-zinc-300 border-zinc-700';

  if (actualValue === 'active' || actualValue === 'ativo' || actualValue === 'concluido' || actualValue === 'aprovado') {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (!text && !label) displayLabel = actualValue === 'concluido' ? 'Venda Concluída' : 'Ativo';
  } else if (actualValue === 'moderate' || actualValue === 'baixa_atividade' || actualValue === 'pendente' || actualValue === 'em_contato') {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (!text && !label) displayLabel = actualValue === 'pendente' ? 'Pendente' : 'Moderado';
  } else if (actualValue === 'inactive' || actualValue === 'inativo' || actualValue === 'suspenso' || actualValue === 'rejeitado' || actualValue === 'cancelado') {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    if (!text && !label) displayLabel = actualValue === 'suspenso' ? 'Suspenso' : 'Inativo';
  } else if (actualValue === 'novo' || actualValue === 'unassigned') {
    colorClasses = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    if (!text && !label) displayLabel = actualValue === 'novo' ? 'Novo' : 'Livre';
  }

  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide capitalize ${sizeClasses} ${colorClasses}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {displayLabel}
    </span>
  );
};
