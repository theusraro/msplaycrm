import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { AuditLog } from '../../types';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
  FileText,
  ChevronDown,
  ChevronRight,
  Filter
} from 'lucide-react';

export const AuditView: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, profiles:user_id(nome_completo, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      addToast(err.message || 'Erro ao carregar registros de auditoria', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const user = (log as any).profiles?.nome_completo || (log as any).profiles?.email || 'Admin/Sistema';
    const matchSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(searchTerm.toLowerCase());

    const matchAction = actionFilter === 'all' || log.action === actionFilter;

    return matchSearch && matchAction;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('create') || action.includes('import')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (action.includes('delete')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (action.includes('distribute')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (action.includes('config') || action.includes('settings')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-brand-red" /> Trilha de Auditoria & Segurança
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Registro imutável de todas as ações administrativas, importações, distribuições de leads e vendas.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 text-xs font-semibold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Logs
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ação, usuário ou detalhes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold text-slate-700 dark:text-zinc-300 outline-none w-full md:w-auto"
          >
            <option value="all">Todas as Ações</option>
            <option value="create_reseller">create_reseller</option>
            <option value="distribute_leads">distribute_leads</option>
            <option value="import_leads">import_leads</option>
            <option value="create_sale">create_sale</option>
            <option value="delete_leads">delete_leads</option>
            <option value="update_ai_config">update_ai_config</option>
            <option value="update_reseller_status">update_reseller_status</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50/75 dark:bg-brand-dark/50 text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Data & Horário</th>
                <th className="py-3 px-4">Ação Executada</th>
                <th className="py-3 px-4">Usuário Responsável</th>
                <th className="py-3 px-4">Resumo dos Dados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-lightBorder dark:divide-brand-darkBorder text-xs">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const user = (log as any).profiles?.nome_completo || (log as any).profiles?.email || 'Sistema / Admin';
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="hover:bg-slate-50/50 dark:hover:bg-brand-dark/40 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{user}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-md truncate font-mono text-[11px]">
                        {JSON.stringify(log.details || {})}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50 dark:bg-brand-dark/60">
                        <td colSpan={5} className="p-4 border-b border-brand-lightBorder dark:border-brand-darkBorder">
                          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
                            <p className="text-slate-400 text-[10px] uppercase font-bold mb-2">Payload Completo do Evento (JSON):</p>
                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <EmptyState
            icon={<ShieldAlert className="w-8 h-8 text-slate-400" />}
            title="Nenhum registro de auditoria"
            description="Nenhuma ação correspondente aos filtros de busca foi encontrada."
          />
        )}
      </div>
    </div>
  );
};
