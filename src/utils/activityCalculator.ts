import { Profile, Sale, ContactAssignment, ResellerActivityStatus } from '../types';

export interface ActivitySummary {
  status: 'active' | 'moderate' | 'inactive';
  lastActivityDate: string | null;
  daysSinceLastActivity: number | null;
  assignedLeads: number;
  pendingLeads: number;
  completedLeads: number;
  conversionRate: number;
  totalSales: number;
  totalRevenue: number;
}

export interface ActivityThresholds {
  activeDays: number;
  lowActivityDays: number;
}

export const defaultActivityThresholds: ActivityThresholds = {
  activeDays: 3,
  lowActivityDays: 7,
};

export function calculateResellerActivity(
  reseller: Profile,
  sales: Sale[] = [],
  assignments: any[] = []
): ActivitySummary {
  const rSales = sales.filter((s) => s.user_id === reseller.id);
  const rAssignments = assignments.filter((a) => a.user_id === reseller.id);

  const assignedLeads = rAssignments.length;
  const pendingLeads = rAssignments.filter((a) => a.status === 'pendente').length;
  const completedLeads = rAssignments.filter((a) => a.status === 'concluido').length;
  const conversionRate =
    assignedLeads > 0 ? Number(((completedLeads / assignedLeads) * 100).toFixed(1)) : 0;

  const totalSales = rSales.length;
  const totalRevenue = rSales.reduce((acc, s) => acc + Number(s.valor || 0), 0);

  // Find most recent timestamp among sales and assignments
  const dates: number[] = [];
  if (reseller.last_activity_at) {
    const t = new Date(reseller.last_activity_at).getTime();
    if (!isNaN(t)) dates.push(t);
  }
  rSales.forEach((s) => {
    const t = new Date(s.created_at).getTime();
    if (!isNaN(t)) dates.push(t);
  });
  rAssignments.forEach((a) => {
    const t = new Date(a.assigned_at || a.created_at).getTime();
    if (!isNaN(t)) dates.push(t);
  });

  let lastActivityDate: string | null = null;
  let daysSinceLastActivity: number | null = null;
  let status: 'active' | 'moderate' | 'inactive' = 'inactive';

  if (dates.length > 0) {
    const maxTime = Math.max(...dates);
    lastActivityDate = new Date(maxTime).toISOString();
    const diffMs = Date.now() - maxTime;
    daysSinceLastActivity = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (daysSinceLastActivity <= 1) {
      status = 'active';
    } else if (daysSinceLastActivity <= 3) {
      status = 'moderate';
    } else {
      status = 'inactive';
    }
  }

  return {
    status,
    lastActivityDate,
    daysSinceLastActivity,
    assignedLeads,
    pendingLeads,
    completedLeads,
    conversionRate,
    totalSales,
    totalRevenue,
  };
}

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
