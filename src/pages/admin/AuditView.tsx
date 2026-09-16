import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AuditLog } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  ShieldCheck,
  Search,
  Filter,
  User,
  Clock,
  FileText,
  Activity,
  RefreshCw,
  Loader2,
  Calendar,
} from 'lucide-react';

export const AuditView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_nome && log.user_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user_email && log.user_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.entidade && log.entidade.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchSearch) return false;
    if (entityFilter !== 'all' && log.entidade !== entityFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Trilha de Auditoria & Conformidade"
        subtitle="Registro em tempo real de todas as ações administrativas e operacionais executadas no sistema."
        icon={ShieldCheck}
        actions={
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:border-zinc-700 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-red' : ''}`} />
            <span>Atualizar Logs</span>
          </button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#121212] p-4 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-brand-red focus:outline-none"
          >
            <option value="all">Todas as Entidades</option>
            <option value="contacts">Contatos / Leads</option>
            <option value="contact_assignments">Atribuições</option>
            <option value="profiles">Revendedores / Acessos</option>
            <option value="sales">Vendas</option>
            <option value="creatives">Criativos</option>
            <option value="api_settings">Configurações de IA</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-brand-red focus:outline-none"
          />
        </div>
      </div>

      {/* Lista / Tabela de Logs */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121212] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 uppercase text-[11px] select-none">
                <th className="py-3.5 px-4 font-semibold">Data / Hora</th>
                <th className="py-3.5 px-4 font-semibold">Responsável</th>
                <th className="py-3.5 px-4 font-semibold">Ação Executada</th>
                <th className="py-3.5 px-4 font-semibold">Entidade</th>
                <th className="py-3.5 px-4 font-semibold">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-red mx-auto mb-2" />
                    Carregando logs de auditoria...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    Nenhum log de auditoria registrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/40 transition">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        <div>
                          <p className="font-bold text-white">{log.user_nome || 'Sistema'}</p>
                          {log.user_email && <p className="text-[10px] text-zinc-500">{log.user_email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-brand-red">
                      {log.acao}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                        {log.entidade}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 max-w-md">
                      {log.detalhes ? (
                        <code className="text-[11px] font-mono text-zinc-300 bg-zinc-900/80 px-2 py-1 rounded block truncate">
                          {typeof log.detalhes === 'object' ? JSON.stringify(log.detalhes) : String(log.detalhes)}
                        </code>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
