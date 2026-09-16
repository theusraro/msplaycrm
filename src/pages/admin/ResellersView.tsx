import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, ResellerStats, ResellerActivityStatus } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ResellerDrawer } from '../../components/admin/ResellerDrawer';
import { PageHeader } from '../../components/ui/PageHeader';
import { calculateActivityStatus, formatRelativeActivity } from '../../utils/activityCalculator';
import { logAuditEvent } from '../../services/auditService';
import { useToast } from '../../contexts/ToastContext';
import {
  Users,
  Search,
  UserPlus,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Phone,
  Mail,
  Shield,
  Eye,
  UserX,
  UserCheck,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';

export const ResellersView: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [resellersData, setResellersData] = useState<ResellerStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'baixa_atividade' | 'inativo' | 'suspenso'>('all');
  const [sortBy, setSortBy] = useState<'nome' | 'leads' | 'sales' | 'conversion' | 'activity'>('activity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal de Criação de Revendedor
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Drawer de Detalhes
  const [selectedResellerStats, setSelectedResellerStats] = useState<ResellerStats | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchResellers = async () => {
    setLoading(true);
    try {
      // 1. Buscar Perfis
      const { data: profilesData, error: profilesErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesErr) throw profilesErr;

      // 2. Buscar Atribuições de Leads agrupadas
      const { data: assignmentsData } = await supabase
        .from('contact_assignments')
        .select('user_id, status, assigned_at, updated_at');

      // 3. Buscar Vendas
      const { data: salesData } = await supabase
        .from('sales')
        .select('user_id, valor, created_at');

      // 4. Buscar Mensagens Logs
      const { data: msgsData } = await supabase
        .from('messages_log')
        .select('user_id, created_at');

      const assignments = assignmentsData || [];
      const sales = salesData || [];
      const msgs = msgsData || [];

      // Mapear estatísticas para cada revendedor
      const statsList: ResellerStats[] = (profilesData || [])
        .filter((p) => p.role === 'user' || p.role === 'admin')
        .map((profile) => {
          const userAssignments = assignments.filter((a) => a.user_id === profile.id);
          const userSales = sales.filter((s) => s.user_id === profile.id);
          const userMsgs = msgs.filter((m) => m.user_id === profile.id);

          const leadsReceived = userAssignments.length;
          const leadsWorked = userAssignments.filter((a) => a.status !== 'novo').length;
          const leadsPending = userAssignments.filter((a) => a.status === 'pendente' || a.status === 'em_contato').length;
          const salesCount = userSales.length || userAssignments.filter((a) => a.status === 'concluido').length;
          const salesValue = userSales.reduce((acc, s) => acc + Number(s.valor || 0), 0);

          const conversionRate = leadsReceived > 0 ? Number(((salesCount / leadsReceived) * 100).toFixed(1)) : 0;

          // Determinar última atividade real (maior timestamp entre login, mensagens, atualização de lead e venda)
          const activityTimestamps = [
            profile.last_activity_at ? new Date(profile.last_activity_at).getTime() : 0,
            ...userAssignments.map((a) => (a.updated_at ? new Date(a.updated_at).getTime() : 0)),
            ...userMsgs.map((m) => new Date(m.created_at).getTime()),
            ...userSales.map((s) => new Date(s.created_at).getTime()),
          ].filter(Boolean);

          const maxTimestamp = activityTimestamps.length > 0 ? Math.max(...activityTimestamps) : null;
          const lastActivityDate = maxTimestamp ? new Date(maxTimestamp).toISOString() : profile.created_at;

          const activityStatus = calculateActivityStatus(lastActivityDate);
          const adminStatus = profile.status_admin || (profile.ativo ? 'ativo' : 'suspenso');

          return {
            profile,
            activityStatus,
            adminStatus,
            leadsReceived,
            leadsWorked,
            leadsPending,
            salesCount,
            salesValue,
            conversionRate,
            lastActivity: lastActivityDate,
          };
        });

      setResellersData(statsList);
    } catch (err: any) {
      console.error('Erro ao carregar revendedores:', err);
      toastError(`Erro ao carregar revendedores: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResellers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          nome: newNome,
          email: newEmail,
          password: newPassword,
          whatsapp: newWhatsapp,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário');

      await logAuditEvent({
        acao: 'Criação de Usuário',
        entidade: 'profiles',
        entityId: data.user?.id,
        detalhes: { nome: newNome, email: newEmail, role: newRole },
      });

      success(`Revendedor ${newNome} criado com sucesso!`);
      setIsCreateModalOpen(false);
      setNewNome('');
      setNewEmail('');
      setNewPassword('');
      setNewWhatsapp('');
      fetchResellers();
    } catch (err: any) {
      toastError(`Erro: ${err.message}`);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleStatus = async (userId: string, newAtivo: boolean, newAdminStatus: 'ativo' | 'suspenso') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ativo: newAtivo,
          status_admin: newAdminStatus,
        })
        .eq('id', userId);

      if (error) throw error;

      await logAuditEvent({
        acao: newAdminStatus === 'suspenso' ? 'Suspensão de Revendedor' : 'Reativação de Revendedor',
        entidade: 'profiles',
        entityId: userId,
        detalhes: { status_admin: newAdminStatus, ativo: newAtivo },
      });

      success(`Status do revendedor atualizado para ${newAdminStatus.toUpperCase()}!`);
      fetchResellers();

      if (selectedResellerStats?.profile.id === userId) {
        setSelectedResellerStats((prev) =>
          prev
            ? {
                ...prev,
                adminStatus: newAdminStatus,
                profile: { ...prev.profile, ativo: newAtivo, status_admin: newAdminStatus },
              }
            : null
        );
      }
    } catch (err: any) {
      toastError(`Erro ao atualizar status: ${err.message}`);
    }
  };

  // Filtragem e Ordenação
  const filteredAndSortedResellers = useMemo(() => {
    return resellersData
      .filter((item) => {
        const matchesSearch =
          item.profile.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.profile.whatsapp && item.profile.whatsapp.includes(searchTerm));

        if (!matchesSearch) return false;

        if (statusFilter === 'all') return true;
        if (statusFilter === 'suspenso') return item.adminStatus === 'suspenso' || !item.profile.ativo;
        return item.activityStatus === statusFilter && item.adminStatus !== 'suspenso';
      })
      .sort((a, b) => {
        let valA: any = a.profile.nome.toLowerCase();
        let valB: any = b.profile.nome.toLowerCase();

        if (sortBy === 'leads') {
          valA = a.leadsReceived;
          valB = b.leadsReceived;
        } else if (sortBy === 'sales') {
          valA = a.salesCount;
          valB = b.salesCount;
        } else if (sortBy === 'conversion') {
          valA = a.conversionRate;
          valB = b.conversionRate;
        } else if (sortBy === 'activity') {
          valA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          valB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [resellersData, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleRowClick = (item: ResellerStats) => {
    setSelectedResellerStats(item);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Gestão de Revendedores"
        subtitle="Monitore a atividade, conversão e desempenho da sua equipe comercial."
        icon={Users}
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-red/20 transition-all hover:bg-brand-redHover active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Revendedor</span>
          </button>
        }
      />

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filtros por Status */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold overflow-x-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'ativo', label: 'Ativos' },
            { id: 'baixa_atividade', label: 'Baixa Atividade' },
            { id: 'inativo', label: 'Inativos' },
            { id: 'suspenso', label: 'Suspensos' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                statusFilter === f.id
                  ? 'bg-brand-red text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-brand-red focus:outline-none"
          />
        </div>
      </div>

      {/* Tabela de Revendedores */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121212] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 uppercase text-[11px] select-none">
                <th
                  onClick={() => {
                    if (sortBy === 'nome') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('nome'); setSortOrder('asc'); }
                  }}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Revendedor</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold">WhatsApp</th>
                <th className="py-3.5 px-4 font-semibold">Status Atividade</th>
                <th
                  onClick={() => {
                    if (sortBy === 'leads') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('leads'); setSortOrder('desc'); }
                  }}
                  className="py-3.5 px-4 font-semibold text-center cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Leads Recebidos</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold text-center">Trabalhados</th>
                <th
                  onClick={() => {
                    if (sortBy === 'sales') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('sales'); setSortOrder('desc'); }
                  }}
                  className="py-3.5 px-4 font-semibold text-center cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Vendas</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortBy === 'conversion') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('conversion'); setSortOrder('desc'); }
                  }}
                  className="py-3.5 px-4 font-semibold text-center cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Conversão</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortBy === 'activity') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('activity'); setSortOrder('desc'); }
                  }}
                  className="py-3.5 px-4 font-semibold text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Última Atividade</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-red mx-auto mb-2" />
                    Carregando revendedores...
                  </td>
                </tr>
              ) : filteredAndSortedResellers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    Nenhum revendedor encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAndSortedResellers.map((item) => (
                  <tr
                    key={item.profile.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-zinc-900/40 cursor-pointer transition group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 text-brand-red flex items-center justify-center font-bold text-xs group-hover:border-brand-red/40 transition">
                          {item.profile.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-brand-red transition">
                            {item.profile.nome}
                          </p>
                          <p className="text-[11px] text-zinc-500">{item.profile.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-medium">
                      {item.profile.whatsapp || <span className="text-zinc-600">Não informado</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge type="activity" value={item.activityStatus} />
                        {item.adminStatus === 'suspenso' && (
                          <StatusBadge type="admin" value="suspenso" />
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-white">
                      {item.leadsReceived}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-zinc-400">
                      {item.leadsWorked}
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-emerald-400">
                      {item.salesCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-400">
                      {item.conversionRate}%
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-400 font-medium">
                      {formatRelativeActivity(item.lastActivity)}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRowClick(item)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer de Detalhes do Revendedor */}
      <ResellerDrawer
        resellerStats={selectedResellerStats}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onStatusChange={handleToggleStatus}
        onRefresh={fetchResellers}
      />

      {/* Modal de Criação de Revendedor */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-brand-red" /> Cadastrar Novo Revendedor
            </h3>
            <p className="text-xs text-zinc-400 mb-5">
              Crie o acesso para um novo membro da equipe de vendas.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="revendedor@msplay.com"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">WhatsApp de Atendimento</label>
                <input
                  type="text"
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)}
                  placeholder="(32) 99999-9999"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Senha Provisória</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Nível de Permissão</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                >
                  <option value="user">Revendedor (Apenas seus próprios leads)</option>
                  <option value="admin">Administrador (Acesso total)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="w-full rounded-xl bg-brand-red hover:bg-brand-redHover py-3 font-bold text-white shadow-lg shadow-brand-red/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingUser ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Criando Acesso...
                    </>
                  ) : (
                    'Criar Revendedor'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
