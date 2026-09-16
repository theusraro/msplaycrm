import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MetricCard } from '../../components/ui/MetricCard';
import { FunnelChart } from '../../components/admin/FunnelChart';
import { SalesTimelineChart } from '../../components/admin/SalesTimelineChart';
import { ActivityTimelineChart } from '../../components/admin/ActivityTimelineChart';
import { calculateActivityStatus, formatRelativeActivity } from '../../utils/activityCalculator';
import {
  Users,
  Inbox,
  UserCheck,
  UserX,
  ShoppingBag,
  TrendingUp,
  MessageSquare,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);

  // Métricas Principais
  const [metrics, setMetrics] = useState({
    totalResellers: 0,
    activeResellers: 0,
    inactiveResellers: 0,
    totalLeads: 0,
    distributedLeads: 0,
    availableLeads: 0,
    salesThisMonth: 0,
    totalSales: 0,
    totalSalesValue: 0,
    conversionRate: '0.0',
    totalMessages: 0,
  });

  const [funnelData, setFunnelData] = useState({
    novo: 0,
    em_contato: 0,
    pendente: 0,
    concluido: 0,
    perdido: 0,
  });

  const [salesTimeline, setSalesTimeline] = useState<any[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [inactiveResellersList, setInactiveResellersList] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Revendedores e Atividade
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'user');

      const resellers = profilesData || [];
      let activeCount = 0;
      let inactiveCount = 0;
      const inactiveList: any[] = [];

      resellers.forEach((r) => {
        const act = calculateActivityStatus(r.last_activity_at || r.created_at);
        if (act === 'ativo') activeCount++;
        else if (act === 'inativo') {
          inactiveCount++;
          inactiveList.push(r);
        }
      });
      setInactiveResellersList(inactiveList.slice(0, 5));

      // 2. Leads (Total e Atribuições)
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      const totalContacts = contactsCount || 0;

      const { data: assignmentsData } = await supabase
        .from('contact_assignments')
        .select('id, status, assigned_at, user_id, contact_id');

      const assignments = assignmentsData || [];
      const assignedContactIds = new Set(assignments.map((a) => a.contact_id));
      const distributedCount = assignedContactIds.size;
      const availableCount = Math.max(0, totalContacts - distributedCount);

      // Funil
      const funnel = { novo: 0, em_contato: 0, pendente: 0, concluido: 0, perdido: 0 };
      assignments.forEach((a) => {
        const st = (a.status || 'novo') as keyof typeof funnel;
        if (st in funnel) funnel[st]++;
      });
      setFunnelData(funnel);

      // 3. Vendas
      const { data: salesData } = await supabase
        .from('sales')
        .select('*, contacts (nome, telefone), profiles (nome, email)')
        .order('created_at', { ascending: false });

      const allSales = salesData || [];
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const salesMonth = allSales.filter((s) => new Date(s.created_at) >= firstDayOfMonth);
      const totalValue = allSales.reduce((acc, s) => acc + Number(s.valor || 0), 0);

      const totalConversions = allSales.length > 0 ? allSales.length : funnel.concluido;
      const totalLeadsBase = totalContacts > 0 ? totalContacts : assignments.length;
      const conversionPercent = totalLeadsBase > 0 ? ((totalConversions / totalLeadsBase) * 100).toFixed(1) : '0.0';

      setRecentSales(allSales.slice(0, 6));

      // 4. Mensagens IA
      const { count: msgCount, data: msgLogs } = await supabase
        .from('messages_log')
        .select('id, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(300);

      // 5. Gráfico de Vendas nos últimos 30 dias
      const last30Days: any[] = [];
      const activityPoints: any[] = [];

      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        // Vendas no dia
        const daySales = allSales.filter((s) => s.created_at.startsWith(dateStr));
        const daySalesValue = daySales.reduce((acc, s) => acc + Number(s.valor || 0), 0);

        last30Days.push({
          date: dateStr,
          displayDate,
          count: daySales.length,
          totalValue: daySalesValue,
        });

        // Atividade no dia (Mensagens + Atribuições)
        const dayMsgs = (msgLogs || []).filter((m) => m.created_at.startsWith(dateStr)).length;
        const dayAssignments = assignments.filter((a) => a.assigned_at.startsWith(dateStr)).length;

        activityPoints.push({
          date: dateStr,
          displayDate,
          messages: dayMsgs,
          assignments: dayAssignments,
        });
      }

      setSalesTimeline(last30Days);
      setActivityTimeline(activityPoints);

      setMetrics({
        totalResellers: resellers.length,
        activeResellers: activeCount,
        inactiveResellers: inactiveCount,
        totalLeads: totalContacts,
        distributedLeads: distributedCount,
        availableLeads: availableCount,
        salesThisMonth: salesMonth.length,
        totalSales: allSales.length || funnel.concluido,
        totalSalesValue: totalValue,
        conversionRate: conversionPercent,
        totalMessages: msgCount || 0,
      });
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header com Saudação em Tempo Real */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            {greeting()}, <span className="text-brand-red">{profile?.nome || 'Admin'}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Acompanhe sua operação MSPLAY em tempo real.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:border-zinc-700 hover:text-white transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-red' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Grid de Cards de Métricas Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revendedores Ativos"
          value={`${metrics.activeResellers} / ${metrics.totalResellers}`}
          subtitle={`${metrics.inactiveResellers} parados sem atividade`}
          icon={Users}
          accentColor="text-brand-red"
          loading={loading}
        />
        <MetricCard
          title="Leads na Base"
          value={metrics.totalLeads}
          subtitle={`${metrics.distributedLeads} distribuídos • ${metrics.availableLeads} livres`}
          icon={Inbox}
          accentColor="text-sky-400"
          loading={loading}
        />
        <MetricCard
          title="Vendas no Mês"
          value={metrics.salesThisMonth}
          subtitle={`Total acumulado: ${metrics.totalSales} vendas`}
          icon={ShoppingBag}
          accentColor="text-emerald-400"
          loading={loading}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${metrics.conversionRate}%`}
          subtitle={`${metrics.totalMessages} mensagens IA geradas`}
          icon={TrendingUp}
          accentColor="text-amber-400"
          loading={loading}
        />
      </div>

      {/* Seção de Gráficos: Funil + Vendas nos 30 dias */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <FunnelChart data={funnelData} totalLeads={metrics.totalLeads} />
        </div>
        <div className="lg:col-span-7">
          <SalesTimelineChart data={salesTimeline} />
        </div>
      </div>

      {/* Atividade da Equipe e Alerta de Revendedores Parados */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ActivityTimelineChart data={activityTimeline} />
        </div>

        {/* Card de Revendedores Parados / Sem Atividade */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-[#121212] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Revendedores Parados
              </h3>
              <button
                onClick={() => onNavigate('resellers')}
                className="text-xs font-bold text-brand-red hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Revendedores cadastrados sem atividade recente nos últimos 7 dias.
            </p>

            <div className="space-y-2.5">
              {inactiveResellersList.map((reseller) => (
                <div
                  key={reseller.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-[11px]">
                      {reseller.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white">{reseller.nome}</p>
                      <p className="text-[10px] text-zinc-500">{reseller.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-400/90 font-semibold">
                    {formatRelativeActivity(reseller.last_activity_at || reseller.created_at)}
                  </span>
                </div>
              ))}
              {inactiveResellersList.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-500">
                  ?? Nenhum revendedor inativo no momento!
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800/80">
            <button
              onClick={() => onNavigate('leads')}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 transition"
            >
              <Inbox className="w-4 h-4 text-brand-red" /> Distribuir Novos Leads para a Equipe
            </button>
          </div>
        </div>
      </div>

      {/* Auditoria de Últimas Vendas */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-500" /> Últimas Vendas Convertidas
          </h3>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs font-bold text-brand-red hover:underline flex items-center gap-1"
          >
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[11px]">
                <th className="pb-3 font-semibold">Revendedor</th>
                <th className="pb-3 font-semibold">Cliente Convertido</th>
                <th className="pb-3 font-semibold">Telefone</th>
                <th className="pb-3 font-semibold">Valor</th>
                <th className="pb-3 font-semibold text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {recentSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-zinc-900/30 transition">
                  <td className="py-3 font-bold text-brand-red">{sale.profiles?.nome || 'Revendedor'}</td>
                  <td className="py-3 font-semibold text-white">{sale.contacts?.nome || 'Cliente'}</td>
                  <td className="py-3 text-zinc-400">{sale.contacts?.telefone || '-'}</td>
                  <td className="py-3 font-bold text-emerald-400">
                    {sale.valor > 0 ? `R$ ${Number(sale.valor).toFixed(2)}` : 'Concluída'}
                  </td>
                  <td className="py-3 text-right text-zinc-500">
                    {new Date(sale.created_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    Nenhuma venda concluída registrada até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
