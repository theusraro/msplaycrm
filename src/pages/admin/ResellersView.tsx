import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { ResellerDrawer } from '../../components/admin/ResellerDrawer';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { calculateResellerActivity, ActivitySummary } from '../../utils/activityCalculator';
import { logAuditEvent } from '../../services/auditService';
import { Profile, Sale } from '../../types';
import {
  Users,
  Search,
  Filter,
  Plus,
  RefreshCw,
  MoreVertical,
  Edit2,
  Lock,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
  UserCheck,
  UserX,
  Eye,
  X,
  Key
} from 'lucide-react';

export const ResellersView: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [resellers, setResellers] = useState<Profile[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ActivitySummary>>({});
  const [selectedReseller, setSelectedReseller] = useState<Profile | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'moderate' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'sales' | 'conversion' | 'activity'>('activity');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<Profile | null>(null);
  const [newResellerData, setNewResellerData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    password: '',
    lead_quota: 20
  });
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resellersRes, salesRes, assignmentsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'reseller'),
        supabase.from('sales').select('*'),
        supabase.from('contact_assignments').select('*')
      ]);

      const resList = resellersRes.data || [];
      const salesList = salesRes.data || [];
      const assignList = assignmentsRes.data || [];

      setResellers(resList);
      setSales(salesList);
      setAssignments(assignList);

      const sums: Record<string, ActivitySummary> = {};
      resList.forEach(r => {
        const rSales = salesList.filter(s => s.user_id === r.id);
        const rAssigns = assignList.filter(a => a.user_id === r.id);
        sums[r.id] = calculateResellerActivity(r, rSales, rAssigns);
      });
      setSummaries(sums);
    } catch (err: any) {
      addToast(err.message || 'Erro ao carregar revendedores', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResellerData.email || !newResellerData.password) {
      addToast('Email e senha são obrigatórios', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // Call secure backend endpoint or Supabase admin
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newResellerData.email,
          password: newResellerData.password,
          nome_completo: newResellerData.nome_completo,
          telefone: newResellerData.telefone,
          lead_quota: Number(newResellerData.lead_quota) || 20,
          role: 'reseller'
        })
      });

      if (!response.ok) {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: newResellerData.email,
          password: newResellerData.password,
          options: {
            data: {
              nome: newResellerData.nome_completo,
              nome_completo: newResellerData.nome_completo,
              telefone: newResellerData.telefone,
              whatsapp: newResellerData.telefone,
              role: 'reseller'
            }
          }
        });
        if (authErr) throw authErr;

        if (authData.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: newResellerData.email,
            nome: newResellerData.nome_completo,
            nome_completo: newResellerData.nome_completo,
            telefone: newResellerData.telefone,
            whatsapp: newResellerData.telefone,
            role: 'reseller',
            status_admin: 'ativo',
            lead_quota: Number(newResellerData.lead_quota) || 20,
            ativo: true
          });
        }
      }

      await logAuditEvent('create_reseller', {
        email: newResellerData.email,
        nome: newResellerData.nome_completo
      });

      addToast('Revendedor cadastrado com sucesso!', 'success');
      setShowCreateModal(false);
      setNewResellerData({ nome_completo: '', email: '', telefone: '', password: '', lead_quota: 20 });
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao cadastrar revendedor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (reseller: Profile) => {
    const isCurrentlyAtivo = reseller.ativo ?? (reseller.status_admin === 'ativo');
    const isAtivo = !isCurrentlyAtivo;
    const newStatusAdmin: 'ativo' | 'suspenso' = isAtivo ? 'ativo' : 'suspenso';

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: isAtivo, status_admin: newStatusAdmin })
        .eq('id', reseller.id);

      if (error) throw error;

      await logAuditEvent('update_reseller_status', {
        reseller_id: reseller.id,
        email: reseller.email,
        ativo: isAtivo,
        status_admin: newStatusAdmin
      });

      addToast(`Status atualizado para ${isAtivo ? 'Ativo' : 'Suspenso'}`, 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao alterar status', 'error');
    }
  };

  const handleUpdateQuota = async (resellerId: string, quota: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ lead_quota: quota })
        .eq('id', resellerId);

      if (error) throw error;
      addToast('Cota de leads atualizada', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao atualizar cota', 'error');
    }
  };

  // Filter & Sort
  const filteredResellers = resellers
    .filter(r => {
      const matchSearch =
        r.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.telefone?.toLowerCase().includes(searchTerm.toLowerCase());

      const summary = summaries[r.id];
      const matchStatus =
        statusFilter === 'all' ||
        (summary && summary.status === statusFilter);

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const sumA = summaries[a.id];
      const sumB = summaries[b.id];

      if (sortBy === 'sales') {
        return (sumB?.totalRevenue || 0) - (sumA?.totalRevenue || 0);
      }
      if (sortBy === 'conversion') {
        return (sumB?.conversionRate || 0) - (sumA?.conversionRate || 0);
      }
      if (sortBy === 'name') {
        return (a.nome_completo || a.email).localeCompare(b.nome_completo || b.email);
      }
      // sort by activity (active first, then moderate, then inactive)
      const order = { active: 0, moderate: 1, inactive: 2 };
      return (order[sumA?.status || 'inactive'] || 2) - (order[sumB?.status || 'inactive'] || 2);
    });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-red" /> Gestão de Revendedores
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Cadastre, monitore o nível de atividade diária, cotas de distribuição e taxas de conversão.
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Revendedor
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-brand-dark p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'all' ? 'bg-white dark:bg-brand-darkCard text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Todos ({resellers.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'active' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500'}`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('moderate')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'moderate' ? 'bg-blue-500 text-white shadow-xs' : 'text-slate-500'}`}
            >
              Moderados
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'inactive' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500'}`}
            >
              Inativos (+3d)
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs p-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold text-slate-700 dark:text-zinc-300 outline-none"
          >
            <option value="activity">Ordenar por: Atividade Recente</option>
            <option value="sales">Ordenar por: Maior Faturamento</option>
            <option value="conversion">Ordenar por: Taxa de Conversão</option>
            <option value="name">Ordenar por: Nome (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Resellers Table */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50/75 dark:bg-brand-dark/50 text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400">
                <th className="py-3 px-4">Revendedor</th>
                <th className="py-3 px-4">Status & Atividade</th>
                <th className="py-3 px-4">Pipeline de Leads</th>
                <th className="py-3 px-4">Conversão & Vendas</th>
                <th className="py-3 px-4">Cota Máxima</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-lightBorder dark:divide-brand-darkBorder text-xs">
              {filteredResellers.map((r) => {
                const sum = summaries[r.id];
                const isActive = r.ativo ?? (r.status_admin === 'ativo');
                return (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-brand-dark/40 transition group"
                  >
                    {/* Reseller info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-red/10 text-brand-red font-black text-sm flex items-center justify-center shrink-0">
                          {(r.nome_completo || r.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">
                            {r.nome_completo || 'Sem nome'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {r.email}</span>
                            {r.telefone && (
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {r.telefone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status & Activity */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <StatusBadge
                          status={sum?.status || 'inactive'}
                          text={
                            sum?.status === 'active'
                              ? 'Ativo Hoje'
                              : sum?.status === 'moderate'
                              ? 'Moderado (1-3d)'
                              : 'Inativo (+3d)'
                          }
                        />
                        <p className="text-[10px] text-slate-400">
                          Última ação: {sum?.daysSinceLastActivity !== null && sum?.daysSinceLastActivity !== undefined ? (sum.daysSinceLastActivity === 0 ? 'Hoje' : `Há ${sum.daysSinceLastActivity} dia(s)`) : 'Nunca'}
                        </p>
                      </div>
                    </td>

                    {/* Leads Pipeline */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <span className="font-bold text-slate-900 dark:text-white">{sum?.assignedLeads || 0}</span>
                          <p className="text-[9px] text-slate-400">Total</p>
                        </div>
                        <div className="text-center">
                          <span className="font-bold text-amber-600 dark:text-amber-400">{sum?.pendingLeads || 0}</span>
                          <p className="text-[9px] text-slate-400">Em curso</p>
                        </div>
                        <div className="text-center">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{sum?.completedLeads || 0}</span>
                          <p className="text-[9px] text-slate-400">Vendeu</p>
                        </div>
                      </div>
                    </td>

                    {/* Conversion & Sales */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {sum?.conversionRate || 0}%
                          </span>
                          <span className="text-[10px] text-slate-400">({sum?.totalSales || 0} vendas)</span>
                        </div>
                        <p className="text-[11px] font-black text-slate-900 dark:text-white mt-0.5">
                          R$ {(sum?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </td>

                    {/* Quota */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          defaultValue={r.lead_quota || 20}
                          onBlur={(e) => handleUpdateQuota(r.id, parseInt(e.target.value) || 20)}
                          className="w-16 p-1.5 text-xs font-bold text-center rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-1 focus:ring-brand-red"
                        />
                        <span className="text-[10px] text-slate-400">leads</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReseller(r)}
                          className="p-1.5 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark hover:bg-brand-red hover:text-white hover:border-brand-red transition text-slate-600 dark:text-zinc-400"
                          title="Ver Detalhes e Histórico"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(r)}
                          className={`p-1.5 rounded-lg border transition ${
                            isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-800'
                              : 'border-red-200 bg-red-50 text-red-600 dark:bg-red-950/40 dark:border-red-800'
                          }`}
                          title={isActive ? 'Desativar Revendedor' : 'Ativar Revendedor'}
                        >
                          {isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredResellers.length === 0 && (
          <EmptyState
            icon={<Users className="w-8 h-8 text-slate-400" />}
            title="Nenhum revendedor encontrado"
            description="Tente ajustar os filtros de busca ou cadastre um novo revendedor no sistema."
            actionLabel="Cadastrar Revendedor"
            onAction={() => setShowCreateModal(true)}
          />
        )}
      </div>

      {/* Create Reseller Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-lightBorder dark:border-brand-darkBorder">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-red" /> Cadastrar Novo Revendedor
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReseller} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={newResellerData.nome_completo}
                  onChange={(e) => setNewResellerData({ ...newResellerData, nome_completo: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Email de Acesso
                </label>
                <input
                  type="email"
                  required
                  placeholder="carlos@exemplo.com"
                  value={newResellerData.email}
                  onChange={(e) => setNewResellerData({ ...newResellerData, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(32) 99999-9999"
                  value={newResellerData.telefone}
                  onChange={(e) => setNewResellerData({ ...newResellerData, telefone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Senha Inicial
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  value={newResellerData.password}
                  onChange={(e) => setNewResellerData({ ...newResellerData, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Cota Máxima de Leads Simultâneos
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={newResellerData.lead_quota}
                  onChange={(e) => setNewResellerData({ ...newResellerData, lead_quota: parseInt(e.target.value) || 20 })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder text-slate-600 dark:text-zinc-300 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-redHover text-white font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Salvando...' : 'Cadastrar Revendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Reseller Drawer */}
      {selectedReseller && (
        <ResellerDrawer
          reseller={selectedReseller}
          summary={summaries[selectedReseller.id]}
          onClose={() => setSelectedReseller(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
};
