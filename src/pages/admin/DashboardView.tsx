import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MetricCard } from '../../components/ui/MetricCard';
import { FunnelChart } from '../../components/admin/FunnelChart';
import { SalesTimelineChart } from '../../components/admin/SalesTimelineChart';
import { ActivityTimelineChart } from '../../components/admin/ActivityTimelineChart';
import { ResellerDrawer } from '../../components/admin/ResellerDrawer';
import { calculateResellerActivity, ActivitySummary } from '../../utils/activityCalculator';
import { Profile, Sale, Contact } from '../../types';
import {
  Users,
  UserCheck,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  UserX,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [resellers, setResellers] = useState<Profile[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedReseller, setSelectedReseller] = useState<Profile | null>(null);
  const [activitySummaries, setActivitySummaries] = useState<Record<string, ActivitySummary>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [resellersRes, salesRes, contactsRes, assignmentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'reseller'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('contacts').select('*'),
        supabase.from('contact_assignments').select('*')
      ]);

      const resList = resellersRes.data || [];
      const salesList = salesRes.data || [];
      const contactsList = contactsRes.data || [];
      const assignList = assignmentsRes.data || [];

      setResellers(resList);
      setSales(salesList);
      setContacts(contactsList);
      setAssignments(assignList);

      // Calculate activities
      const summaries: Record<string, ActivitySummary> = {};
      resList.forEach(r => {
        const rSales = salesList.filter(s => s.user_id === r.id);
        const rAssigns = assignList.filter(a => a.user_id === r.id);
        summaries[r.id] = calculateResellerActivity(r, rSales, rAssigns);
      });
      setActivitySummaries(summaries);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Metrics
  const totalResellers = resellers.length;
  const activeResellers = Object.values(activitySummaries).filter(s => s.status === 'active').length;
  const inactiveResellers = Object.values(activitySummaries).filter(s => s.status === 'inactive').length;

  const totalSalesRevenue = sales.reduce((acc, s) => acc + Number(s.valor || 0), 0);
  const totalSalesCount = sales.length;

  const totalLeads = contacts.length;
  const assignedLeadsCount = assignments.length;
  const completedLeadsCount = assignments.filter(a => a.status === 'concluido').length;
  const pendingLeadsCount = assignments.filter(a => a.status === 'pendente').length;
  const newLeadsCount = assignments.filter(a => a.status === 'novo').length;

  const conversionRate = assignedLeadsCount > 0 ? ((completedLeadsCount / assignedLeadsCount) * 100).toFixed(1) : '0';

  // Funnel Data
  const funnelStages = [
    { label: 'Total de Leads na Base', count: totalLeads, color: 'bg-blue-500' },
    { label: 'Leads Distribuídos', count: assignedLeadsCount, color: 'bg-indigo-500' },
    { label: 'Em Atendimento (Pendente)', count: pendingLeadsCount, color: 'bg-amber-500' },
    { label: 'Vendas Concluídas', count: completedLeadsCount, color: 'bg-emerald-500' },
  ];

  // Inactive Alerts (>3 days or never)
  const inactiveList = resellers.filter(r => {
    const sum = activitySummaries[r.id];
    return sum && sum.status === 'inactive';
  });

  // Top Resellers by completed leads / sales
  const topResellers = [...resellers].sort((a, b) => {
    const aSales = activitySummaries[a.id]?.totalSales || 0;
    const bSales = activitySummaries[b.id]?.totalSales || 0;
    return bSales - aSales;
  }).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Visão Geral de Operações CRM
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Monitoramento em tempo real de revendedores, pipeline de leads e faturamento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-xs font-semibold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard hover:bg-slate-50 dark:hover:bg-brand-dark text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Faturamento Total"
          value={`R$ ${totalSalesRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${totalSalesCount} vendas registradas`}
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
        />
        <MetricCard
          title="Revendedores Ativos"
          value={`${activeResellers} / ${totalResellers}`}
          subtitle={`${inactiveResellers} inativos (+3 dias)`}
          icon={<Users className="w-5 h-5" />}
          variant={inactiveResellers > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${conversionRate}%`}
          subtitle={`${completedLeadsCount} vendas de ${assignedLeadsCount} leads`}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="default"
        />
        <MetricCard
          title="Leads no Sistema"
          value={totalLeads}
          subtitle={`${assignedLeadsCount} distribuídos • ${totalLeads - assignedLeadsCount} livres`}
          icon={<Layers className="w-5 h-5" />}
          variant="default"
        />
      </div>

      {/* Inactivity Alert Banner if any */}
      {inactiveList.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Atenção: {inactiveList.length} revendedor(es) sem atividade recente
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Revendedores sem vendas ou contato com leads nos últimos 3 dias podem estar acumulando leads sem atendimento.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('resellers')}
            className="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition shrink-0 flex items-center gap-1.5"
          >
            Ver Inativos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Charts Grid: Funnel & Sales Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <FunnelChart stages={funnelStages} />
        </div>
        <div className="lg:col-span-6">
          <SalesTimelineChart sales={sales} days={14} />
        </div>
      </div>

      {/* Activity Heatmap Timeline & Top Resellers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ActivityTimelineChart resellers={resellers} sales={sales} assignments={assignments} />
        </div>

        {/* Top Resellers Leaderboard */}
        <div className="lg:col-span-5 bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-red" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Top Revendedores
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('resellers')}
                className="text-[11px] font-bold text-brand-red hover:underline flex items-center gap-1"
              >
                Ver todos <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {topResellers.map((r, idx) => {
                const sum = activitySummaries[r.id];
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReseller(r)}
                    className="p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder hover:border-brand-red/40 dark:hover:border-brand-red/40 bg-slate-50/50 dark:bg-brand-dark/40 cursor-pointer transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-brand-red/10 text-brand-red font-black text-xs flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {r.nome_completo || r.email}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {sum?.completedLeads || 0} leads convertidos • {sum?.totalSales || 0} vendas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {sum?.conversionRate || 0}%
                      </span>
                      <p className="text-[9px] text-slate-400">conversão</p>
                    </div>
                  </div>
                );
              })}
              {topResellers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">Nenhum revendedor cadastrado.</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-brand-lightBorder dark:border-brand-darkBorder flex items-center justify-between text-xs">
            <span className="text-slate-500">Distribuição rápida de leads</span>
            <button
              onClick={() => onNavigateTab('leads')}
              className="px-3 py-1.5 bg-brand-red text-white font-bold rounded-xl text-xs hover:bg-brand-redHover transition flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" /> Distribuir Agora
            </button>
          </div>
        </div>
      </div>

      {/* Selected Reseller Drawer */}
      {selectedReseller && (
        <ResellerDrawer
          reseller={selectedReseller}
          summary={activitySummaries[selectedReseller.id]}
          onClose={() => setSelectedReseller(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
};
