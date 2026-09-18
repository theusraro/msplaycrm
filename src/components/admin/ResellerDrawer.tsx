import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Profile, ResellerStats, ContactAssignment, Sale, MessageLog } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { ActivitySummary, formatRelativeActivity } from '../../utils/activityCalculator';
import {
  X,
  Phone,
  Mail,
  Shield,
  CheckCircle2,
  AlertTriangle,
  UserX,
  UserCheck,
} from 'lucide-react';

export interface ResellerDrawerProps {
  reseller?: Profile | null;
  summary?: ActivitySummary;
  resellerStats?: ResellerStats | null;
  isOpen?: boolean;
  onClose: () => void;
  onStatusChange?: (userId: string, newStatus: boolean, adminStatus: 'ativo' | 'suspenso') => Promise<void>;
  onUpdate?: () => void;
  onRefresh?: () => void;
}

export const ResellerDrawer: React.FC<ResellerDrawerProps> = ({
  reseller: propReseller,
  summary: propSummary,
  resellerStats,
  isOpen = true,
  onClose,
  onStatusChange,
  onUpdate,
  onRefresh,
}) => {
  const currentReseller = propReseller || resellerStats?.profile;

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
    if (currentReseller) {
      setWhatsappEdit(currentReseller.whatsapp || currentReseller.telefone || '');
      setNomeEdit(currentReseller.nome_completo || currentReseller.nome || '');
      fetchDetails(currentReseller.id);
    }
  }, [currentReseller]);

  const fetchDetails = async (userId: string) => {
    setLoadingData(true);
    try {
      const { data: leadsData } = await supabase
        .from('contact_assignments')
        .select('*, contacts (*)')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });
      if (leadsData) setAssignedLeads(leadsData);

      const { data: salesData } = await supabase
        .from('sales')
        .select('*, contacts (*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (salesData) setSalesHistory(salesData);

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

  if (!isOpen || !currentReseller) return null;

  const profile = currentReseller;
  const activityStatus = propSummary?.status || resellerStats?.activityStatus || 'inactive';
  const leadsReceived = propSummary?.assignedLeads || resellerStats?.leadsReceived || assignedLeads.length;
  const leadsPending = propSummary?.pendingLeads || resellerStats?.leadsPending || 0;
  const salesCount = propSummary?.totalSales || resellerStats?.salesCount || salesHistory.length;
  const conversionRate = propSummary?.conversionRate || resellerStats?.conversionRate || 0;
  const lastActivity = propSummary?.lastActivityDate || resellerStats?.lastActivity || profile.last_activity_at;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await supabase
        .from('profiles')
        .update({
          nome_completo: nomeEdit,
          nome: nomeEdit,
          telefone: whatsappEdit,
          whatsapp: whatsappEdit,
        })
        .eq('id', profile.id);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      if (onUpdate) onUpdate();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleSuspension = async () => {
    const isCurrentlyActive = profile.ativo ?? (profile.admin_status === 'ativo');
    const newAtivo = !isCurrentlyActive;
    const newAdminStatus: 'ativo' | 'suspenso' = newAtivo ? 'ativo' : 'suspenso';

    setIsUpdating(true);
    if (onStatusChange) {
      await onStatusChange(profile.id, newAtivo, newAdminStatus);
    } else {
      await supabase
        .from('profiles')
        .update({ ativo: newAtivo, admin_status: newAdminStatus })
        .eq('id', profile.id);
    }
    if (onUpdate) onUpdate();
    if (onRefresh) onRefresh();
    setIsUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#121212] border-l border-brand-lightBorder dark:border-zinc-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        <div className="p-6 border-b border-brand-lightBorder dark:border-zinc-800 flex items-start justify-between bg-slate-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red font-black text-lg">
              {(profile.nome_completo || profile.nome || profile.email).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                {profile.nome_completo || profile.nome || profile.email}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={activityStatus} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-slate-100 dark:bg-zinc-950/60 border-b border-brand-lightBorder dark:border-zinc-800 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-brand-lightBorder dark:border-zinc-800/80">
            <span className="text-slate-500 dark:text-zinc-500 block text-[10px] uppercase font-bold">Última Atividade</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">{formatRelativeActivity(lastActivity)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-brand-lightBorder dark:border-zinc-800/80">
            <span className="text-slate-500 dark:text-zinc-500 block text-[10px] uppercase font-bold">Data de Entrada</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">
              {new Date(profile.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-brand-lightBorder dark:border-zinc-800/80">
            <span className="text-slate-500 dark:text-zinc-500 block text-[10px] uppercase font-bold">Leads Recebidos</span>
            <span className="font-black text-slate-900 dark:text-white text-sm">{leadsReceived}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/60 border border-brand-lightBorder dark:border-zinc-800/80">
            <span className="text-slate-500 dark:text-zinc-500 block text-[10px] uppercase font-bold">Conversão</span>
            <span className="font-black text-emerald-500 dark:text-emerald-400 text-sm">{conversionRate}%</span>
          </div>
        </div>

        <div className="flex border-b border-brand-lightBorder dark:border-zinc-800 px-6 bg-slate-50 dark:bg-zinc-900/20 text-xs font-bold gap-2 overflow-x-auto">
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
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60">
                  <span className="text-xs text-slate-500 dark:text-zinc-400 block font-semibold">Leads Atribuídos</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{leadsReceived}</span>
                </div>
                <div className="p-4 rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60">
                  <span className="text-xs text-slate-500 dark:text-zinc-400 block font-semibold">Em Negociação</span>
                  <span className="text-xl font-black text-amber-500">{leadsPending}</span>
                </div>
                <div className="p-4 rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60">
                  <span className="text-xs text-slate-500 dark:text-zinc-400 block font-semibold">Vendas Fechadas</span>
                  <span className="text-xl font-black text-emerald-500">{salesCount}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-brand-lightBorder dark:border-zinc-800 bg-white dark:bg-zinc-900/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Contatos do Revendedor</h4>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
                  <Phone className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <span>{profile.telefone || profile.whatsapp || 'WhatsApp não cadastrado'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
                  <Shield className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <span className="capitalize">Função: {profile.role}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="space-y-3">
              {loadingData ? (
                <div className="py-12 text-center text-xs text-slate-400">Carregando leads do revendedor...</div>
              ) : assignedLeads.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-brand-lightBorder dark:border-zinc-800 rounded-2xl">
                  Nenhum lead atribuído a este revendedor.
                </div>
              ) : (
                assignedLeads.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center justify-between text-xs hover:border-brand-red/30 transition"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{item.contacts?.nome || 'Sem Nome'}</h4>
                      <p className="text-slate-500 dark:text-zinc-400 text-[11px] flex items-center gap-2 mt-0.5">
                        <span>{item.contacts?.telefone}</span>
                        {item.contacts?.tags && Array.isArray(item.contacts.tags) && item.contacts.tags.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 uppercase">
                            {item.contacts.tags.join(', ')}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={item.status} />
                      <span className="block text-[10px] text-slate-400 mt-1">
                        {new Date(item.assigned_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-3">
              {salesHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-brand-lightBorder dark:border-zinc-800 rounded-2xl">
                  Nenhuma venda registrada por este revendedor.
                </div>
              ) : (
                salesHistory.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{s.contacts?.nome || 'Cliente'}</span>
                      <p className="text-slate-500 dark:text-zinc-400 text-[11px]">{s.contacts?.telefone}</p>
                      {s.observacoes && <p className="text-[11px] text-slate-400 mt-1">{s.observacoes}</p>}
                    </div>
                    <div className="text-right">
                      {s.valor > 0 && (
                        <span className="font-black text-slate-900 dark:text-white text-sm block">
                          R$ {Number(s.valor).toFixed(2)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(s.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-3">
              {messageLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-brand-lightBorder dark:border-zinc-800 rounded-2xl">
                  Nenhum disparo de mensagem IA registrado.
                </div>
              ) : (
                messageLogs.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-xs space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-brand-red uppercase">{m.tipo_mensagem}</span>
                      <span className="text-slate-400">{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-slate-700 dark:text-zinc-300 italic bg-slate-50 dark:bg-zinc-950/60 p-2.5 rounded-lg border border-brand-lightBorder dark:border-zinc-800/80 font-mono text-[11px] leading-relaxed">
                      "{m.mensagem_gerada}"
                    </p>
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>Provedor: {m.provedor_ia}</span>
                      <span>Modelo: {m.modelo}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveProfile} className="p-5 rounded-2xl border border-brand-lightBorder dark:border-zinc-800 bg-white dark:bg-zinc-900/30 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Editar Dados do Revendedor</h4>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={nomeEdit}
                    onChange={(e) => setNomeEdit(e.target.value)}
                    className="w-full rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-brand-red focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1">WhatsApp de Atendimento</label>
                  <input
                    type="text"
                    placeholder="(32) 99999-9999"
                    value={whatsappEdit}
                    onChange={(e) => setWhatsappEdit(e.target.value)}
                    className="w-full rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-brand-red focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {saveSuccess && (
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
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

              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Controle de Acesso
                </h4>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Suspender o revendedor bloqueia temporariamente seu acesso à plataforma sem apagar seus dados ou histórico.
                </p>
                <button
                  type="button"
                  onClick={handleToggleSuspension}
                  disabled={isUpdating}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg transition ${
                    !profile.ativo || profile.admin_status === 'suspenso'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {!profile.ativo || profile.admin_status === 'suspenso' ? (
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
