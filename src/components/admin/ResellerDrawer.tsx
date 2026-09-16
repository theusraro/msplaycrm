import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, ResellerStats, ContactAssignment, Sale, MessageLog } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { formatRelativeActivity } from '../../utils/activityCalculator';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  UserX,
  UserCheck,
  PlusCircle,
  MessageSquare,
  Shield,
  Send,
} from 'lucide-react';

interface ResellerDrawerProps {
  resellerStats: ResellerStats | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (userId: string, newStatus: boolean, adminStatus: 'ativo' | 'suspenso') => Promise<void>;
  onRefresh: () => void;
}

export const ResellerDrawer: React.FC<ResellerDrawerProps> = ({
  resellerStats,
  isOpen,
  onClose,
  onStatusChange,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'sales' | 'messages' | 'admin'>('overview');
  const [assignedLeads, setAssignedLeads] = useState<ContactAssignment[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [whatsappEdit, setWhatsappEdit] = useState('');
  const [nomeEdit, setNomeEdit] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (resellerStats && isOpen) {
      setWhatsappEdit(resellerStats.profile.whatsapp || '');
      setNomeEdit(resellerStats.profile.nome || '');
      fetchDetails(resellerStats.profile.id);
    }
  }, [resellerStats, isOpen]);

  const fetchDetails = async (userId: string) => {
    setLoadingData(true);
    try {
      // 1. Leads atribuídos
      const { data: leadsData } = await supabase
        .from('contact_assignments')
        .select('*, contacts (*)')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });
      if (leadsData) setAssignedLeads(leadsData);

      // 2. Histórico de Vendas
      const { data: salesData } = await supabase
        .from('sales')
        .select('*, contacts (*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (salesData) setSalesHistory(salesData);

      // 3. Histórico de Mensagens IA
      const { data: msgData } = await supabase
        .from('messages_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (msgData) setMessageLogs(msgData);
    } catch (err) {
      console.error('Erro ao buscar detalhes do revendedor:', err);
    } finally {
      setLoadingData(false);
    }
  };

  if (!isOpen || !resellerStats) return null;

  const { profile, activityStatus, adminStatus, leadsReceived, leadsWorked, leadsPending, salesCount, conversionRate, lastActivity } = resellerStats;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await supabase
        .from('profiles')
        .update({
          nome: nomeEdit,
          whatsapp: whatsappEdit,
        })
        .eq('id', profile.id);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      onRefresh();
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleSuspension = async () => {
    const isCurrentlySuspended = adminStatus === 'suspenso' || !profile.ativo;
    const newAdminStatus = isCurrentlySuspended ? 'ativo' : 'suspenso';
    const newAtivo = isCurrentlySuspended;

    setIsUpdating(true);
    await onStatusChange(profile.id, newAtivo, newAdminStatus);
    setIsUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#121212] border-l border-zinc-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header do Drawer */}
        <div className="p-6 border-b border-zinc-800 flex items-start justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red font-black text-lg">
              {profile.nome.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                {profile.nome}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge type="activity" value={activityStatus} />
                {adminStatus === 'suspenso' && <StatusBadge type="admin" value="suspenso" />}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-zinc-950/60 border-b border-zinc-800 text-xs">
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Última Atividade</span>
            <span className="font-bold text-zinc-200">{formatRelativeActivity(lastActivity)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Data de Entrada</span>
            <span className="font-bold text-zinc-200">
              {new Date(profile.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Leads Recebidos</span>
            <span className="font-black text-white text-sm">{leadsReceived}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Conversão</span>
            <span className="font-black text-emerald-400 text-sm">{conversionRate}%</span>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-900/20 text-xs font-bold gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Visão Geral' },
            { id: 'leads', label: `Leads (${assignedLeads.length})` },
            { id: 'sales', label: `Vendas (${salesHistory.length})` },
            { id: 'messages', label: `Mensagens IA (${messageLogs.length})` },
            { id: 'admin', label: 'Administração' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ABA: VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <span className="text-xs text-zinc-400 block font-semibold">Leads Trabalhados</span>
                  <span className="text-xl font-black text-white">{leadsWorked}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">
                    {leadsReceived > 0 ? `${((leadsWorked / leadsReceived) * 100).toFixed(0)}% do total` : '0%'}
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <span className="text-xs text-zinc-400 block font-semibold">Em Negociação</span>
                  <span className="text-xl font-black text-amber-400">{leadsPending}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Pendentes</span>
                </div>
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <span className="text-xs text-zinc-400 block font-semibold">Vendas Fechadas</span>
                  <span className="text-xl font-black text-emerald-400">{salesCount}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Convertidos</span>
                </div>
              </div>

              {/* Contatos e Canais */}
              <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Contatos do Revendedor</h4>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Phone className="w-4 h-4 text-zinc-500" />
                  <span>{profile.whatsapp || 'WhatsApp não cadastrado'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Shield className="w-4 h-4 text-zinc-500" />
                  <span className="capitalize">Função: {profile.role}</span>
                </div>
              </div>
            </div>
          )}

          {/* ABA: LEADS */}
          {activeTab === 'leads' && (
            <div className="space-y-3">
              {loadingData ? (
                <div className="py-12 text-center text-xs text-zinc-500">Carregando leads do revendedor...</div>
              ) : assignedLeads.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  Nenhum lead atribuído a este revendedor.
                </div>
              ) : (
                assignedLeads.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs hover:border-zinc-700 transition"
                  >
                    <div>
                      <h4 className="font-bold text-white">{item.contacts?.nome || 'Sem Nome'}</h4>
                      <p className="text-zinc-400 text-[11px] flex items-center gap-2 mt-0.5">
                        <span>{item.contacts?.telefone}</span>
                        {item.contacts?.origem && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                            {item.contacts.origem}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge type="lead" value={item.status} />
                      <span className="block text-[10px] text-zinc-500 mt-1">
                        {new Date(item.assigned_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA: VENDAS */}
          {activeTab === 'sales' && (
            <div className="space-y-3">
              {salesHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  Nenhuma venda registrada por este revendedor.
                </div>
              ) : (
                salesHistory.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-emerald-950/40 bg-emerald-950/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-emerald-400">{s.contacts?.nome || 'Cliente'}</span>
                      <p className="text-zinc-400 text-[11px]">{s.contacts?.telefone}</p>
                      {s.observacoes && <p className="text-[11px] text-zinc-500 mt-1">{s.observacoes}</p>}
                    </div>
                    <div className="text-right">
                      {s.valor > 0 && (
                        <span className="font-black text-white text-sm block">
                          R$ {Number(s.valor).toFixed(2)}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400">
                        {new Date(s.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA: MENSAGENS IA */}
          {activeTab === 'messages' && (
            <div className="space-y-3">
              {messageLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  Nenhum disparo de mensagem IA registrado.
                </div>
              ) : (
                messageLogs.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-brand-red uppercase">{m.tipo_mensagem}</span>
                      <span className="text-zinc-500">{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-zinc-300 italic bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80 font-mono text-[11px] leading-relaxed">
                      "{m.mensagem_gerada}"
                    </p>
                    <div className="flex justify-between text-[10px] text-zinc-500 font-semibold">
                      <span>Provedor: {m.provedor_ia}</span>
                      <span>Modelo: {m.modelo}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ABA: ADMINISTRAÇÃO */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              {/* Editar Dados */}
              <form onSubmit={handleSaveProfile} className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Editar Dados do Revendedor</h4>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={nomeEdit}
                    onChange={(e) => setNomeEdit(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-white focus:border-brand-red focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">WhatsApp de Atendimento</label>
                  <input
                    type="text"
                    placeholder="(32) 99999-9999"
                    value={whatsappEdit}
                    onChange={(e) => setWhatsappEdit(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-white focus:border-brand-red focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {saveSuccess && (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Alterações salvas com sucesso!
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="ml-auto rounded-xl bg-brand-red hover:bg-brand-redHover px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-red/20 transition disabled:opacity-50"
                  >
                    {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>

              {/* Ações Administrativas de Segurança */}
              <div className="p-5 rounded-2xl border border-rose-950/40 bg-rose-950/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Controle de Acesso
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Suspender o revendedor bloqueia temporariamente seu acesso à plataforma sem apagar seus dados ou histórico.
                </p>
                <button
                  type="button"
                  onClick={handleToggleSuspension}
                  disabled={isUpdating}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg transition ${
                    adminStatus === 'suspenso' || !profile.ativo
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  }`}
                >
                  {adminStatus === 'suspenso' || !profile.ativo ? (
                    <>
                      <UserCheck className="w-4 h-4" /> Reativar Acesso do Revendedor
                    </>
                  ) : (
                    <>
                      <UserX className="w-4 h-4" /> Suspender Acesso do Revendedor
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
