import { ResellerActivityStatus } from '../types';

export interface ActivityThresholds {
  activeDays: number;
  lowActivityDays: number;
}

export const defaultActivityThresholds: ActivityThresholds = {
  activeDays: 3,
  lowActivityDays: 7,
};

export function calculateActivityStatus(
  lastActivityDate: string | Date | null | undefined,
  thresholds: ActivityThresholds = defaultActivityThresholds
): ResellerActivityStatus {
  if (!lastActivityDate) {
    return 'inativo';
  }

  const date = new Date(lastActivityDate);
  if (isNaN(date.getTime())) {
    return 'inativo';
  }

  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= thresholds.activeDays) {
    return 'ativo';
  }
  if (diffDays <= thresholds.lowActivityDays) {
    return 'baixa_atividade';
  }
  return 'inativo';
}

export function formatRelativeActivity(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'Sem registro';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Sem registro';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `Há ${diffMins} min`;

  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Hoje às ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Ontem às ${timeStr}`;

  if (diffDays <= 7) return `Há ${diffDays} dias`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
