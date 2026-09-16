import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { logAuditEvent } from '../../services/auditService';
import { Contact, Profile } from '../../types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Layers,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Upload,
  Download,
  Share2,
  Trash2,
  User,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Zap,
  ArrowRight
} from 'lucide-react';

interface ContactWithAssignment extends Contact {
  assignment?: {
    id: string;
    user_id: string;
    status: 'novo' | 'pendente' | 'concluido';
    assigned_at: string;
    reseller?: {
      nome_completo?: string;
      email: string;
    };
  };
}

export const LeadsView: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactWithAssignment[]>([]);
  const [resellers, setResellers] = useState<Profile[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'novo' | 'pendente' | 'concluido'>('all');
  const [resellerFilter, setResellerFilter] = useState<string>('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState({ nome: '', telefone: '', observacoes: '', origem: 'manual' });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [distributeTargetReseller, setDistributeTargetReseller] = useState<string>('auto');
  const [distributing, setDistributing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsRes, assignmentsRes, resellersRes] = await Promise.all([
        supabase.from('contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('contact_assignments').select('*, profiles:user_id(nome_completo, email)'),
        supabase.from('profiles').select('*').eq('role', 'reseller').eq('status', 'active')
      ]);

      const cList = contactsRes.data || [];
      const aList = assignmentsRes.data || [];
      setResellers(resellersRes.data || []);

      // Merge assignments into contacts
      const merged: ContactWithAssignment[] = cList.map((c: any) => {
        const assign = aList.find((a: any) => a.contact_id === c.id);
        return {
          ...c,
          assignment: assign
            ? {
                id: assign.id,
                user_id: assign.user_id,
                status: assign.status || 'novo',
                assigned_at: assign.assigned_at,
                reseller: assign.profiles
              }
            : undefined
        };
      });

      setContacts(merged);
    } catch (err: any) {
      addToast(err.message || 'Erro ao carregar leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchSearch =
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.observacoes && c.observacoes.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchStatus = true;
    if (statusFilter === 'unassigned') {
      matchStatus = !c.assignment;
    } else if (statusFilter !== 'all') {
      matchStatus = c.assignment?.status === statusFilter;
    }

    let matchReseller = true;
    if (resellerFilter !== 'all') {
      matchReseller = c.assignment?.user_id === resellerFilter;
    }

    return matchSearch && matchStatus && matchReseller;
  });

  const unassignedCount = contacts.filter((c) => !c.assignment).length;

  // Single Lead Creation
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadData.nome || !newLeadData.telefone) {
      addToast('Nome e telefone são obrigatórios', 'warning');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert([{ ...newLeadData, status: 'novo' }])
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent('create_lead', {
        contact_id: data.id,
        nome: data.nome,
        telefone: data.telefone
      });

      addToast('Lead cadastrado com sucesso!', 'success');
      setShowCreateModal(false);
      setNewLeadData({ nome: '', telefone: '', observacoes: '', origem: 'manual' });
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao cadastrar lead', 'error');
    }
  };

  // Delete Leads
  const handleDeleteLeads = async (ids: string[]) => {
    if (!confirm(`Deseja excluir ${ids.length} lead(s) selecionado(s)?`)) return;

    try {
      const { error } = await supabase.from('contacts').delete().in('id', ids);
      if (error) throw error;

      await logAuditEvent('delete_leads', { count: ids.length, ids });
      addToast(`${ids.length} lead(s) excluído(s) com sucesso`, 'success');
      setSelectedLeadIds([]);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao excluir leads', 'error');
    }
  };

  // File Import Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          setImportPreview(results.data.slice(0, 5));
        },
        error: (err: any) => {
          addToast('Erro ao ler CSV: ' + err.message, 'error');
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          setImportPreview(data.slice(0, 5));
        } catch (err: any) {
          addToast('Erro ao ler Excel: ' + err.message, 'error');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile) return;
    setImportLoading(true);

    try {
      let rowsToProcess: any[] = [];

      if (importFile.name.toLowerCase().endsWith('.csv')) {
        await new Promise((resolve, reject) => {
          Papa.parse(importFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              rowsToProcess = results.data;
              resolve(true);
            },
            error: reject
          });
        });
      } else {
        const data = await importFile.arrayBuffer();
        const wb = XLSX.read(data);
        const ws = wb.Sheets[wb.SheetNames[0]];
        rowsToProcess = XLSX.utils.sheet_to_json(ws);
      }

      // Map rows to contacts schema
      interface FormattedContact {
        nome: string;
        telefone: string;
        observacoes: string;
        origem: string;
        status: string;
      }

      const formatted: FormattedContact[] = rowsToProcess
        .map((row: any): FormattedContact | null => {
          const nome = row.nome || row.Nome || row.name || row.Name || row.Cliente || row.cliente || '';
          const telefone = row.telefone || row.Telefone || row.phone || row.Phone || row.WhatsApp || row.whatsapp || row.Celular || row.celular || '';
          const observacoes = row.observacoes || row.Observacoes || row.notas || row.Notas || row.obs || row.Obs || '';

          if (!nome || !telefone) return null;

          return {
            nome: String(nome).trim(),
            telefone: String(telefone).trim(),
            observacoes: String(observacoes || '').trim(),
            origem: 'import_csv',
            status: 'novo'
          };
        })
        .filter((item): item is FormattedContact => item !== null);

      if (formatted.length === 0) {
        addToast('Nenhum contato válido encontrado no arquivo. Verifique se as colunas possuem Nome e Telefone.', 'warning');
        setImportLoading(false);
        return;
      }

      // Insert in chunks of 100
      for (let i = 0; i < formatted.length; i += 100) {
        const chunk = formatted.slice(i, i + 100);
        const { error } = await supabase.from('contacts').insert(chunk);
        if (error) throw error;
      }

      await logAuditEvent('import_leads', {
        count: formatted.length,
        filename: importFile.name
      });

      addToast(`${formatted.length} leads importados com sucesso!`, 'success');
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao importar leads', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  // Export Leads
  const handleExportCSV = () => {
    const exportData = filteredContacts.map((c) => ({
      Nome: c.nome,
      Telefone: c.telefone,
      Observacoes: c.observacoes || '',
      Origem: c.origem || '',
      Status: c.assignment?.status || 'Não atribuído',
      Revendedor: c.assignment?.reseller?.nome_completo || c.assignment?.reseller?.email || 'Nenhum',
      DataCadastro: new Date(c.created_at).toLocaleDateString('pt-BR')
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_msplay_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Arquivo CSV exportado com sucesso', 'success');
  };

  // Distribution Algorithm (Smart Equal / Quota Distribution)
  const handleDistributeLeads = async () => {
    if (resellers.length === 0) {
      addToast('Não há revendedores ativos para receber leads.', 'warning');
      return;
    }

    setDistributing(true);
    try {
      // Find unassigned leads or selected unassigned leads
      let leadsToDistribute = contacts.filter((c) => !c.assignment);
      if (selectedLeadIds.length > 0) {
        leadsToDistribute = leadsToDistribute.filter((c) => selectedLeadIds.includes(c.id));
      }

      if (leadsToDistribute.length === 0) {
        addToast('Nenhum lead livre selecionado para distribuição.', 'warning');
        setDistributing(false);
        return;
      }

      const assignmentsToInsert: any[] = [];

      if (distributeTargetReseller === 'auto') {
        // Round-robin distribution across active resellers respecting quotas
        let resellerIndex = 0;
        leadsToDistribute.forEach((lead) => {
          const targetReseller = resellers[resellerIndex % resellers.length];
          assignmentsToInsert.push({
            contact_id: lead.id,
            user_id: targetReseller.id,
            status: 'novo',
            assigned_at: new Date().toISOString()
          });
          resellerIndex++;
        });
      } else {
        // Assign all to specific reseller
        leadsToDistribute.forEach((lead) => {
          assignmentsToInsert.push({
            contact_id: lead.id,
            user_id: distributeTargetReseller,
            status: 'novo',
            assigned_at: new Date().toISOString()
          });
        });
      }

      // Insert assignments in chunks
      for (let i = 0; i < assignmentsToInsert.length; i += 100) {
        const chunk = assignmentsToInsert.slice(i, i + 100);
        const { error } = await supabase.from('contact_assignments').insert(chunk);
        if (error) throw error;
      }

      await logAuditEvent('distribute_leads', {
        count: assignmentsToInsert.length,
        mode: distributeTargetReseller === 'auto' ? 'round_robin' : 'single_reseller',
        target: distributeTargetReseller
      });

      addToast(`${assignmentsToInsert.length} leads distribuídos com sucesso!`, 'success');
      setShowDistributeModal(false);
      setSelectedLeadIds([]);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao distribuir leads', 'error');
    } finally {
      setDistributing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredContacts.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredContacts.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((item) => item !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-red" /> Gestão e Distribuição de Leads
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Importe listas CSV/Excel, gerencie o funil e faça a distribuição automática para revendedores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-xs font-semibold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard hover:bg-slate-50 text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-blue-500" /> Importar Planilha
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard hover:bg-slate-50 text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" /> Exportar CSV
          </button>
          <button
            onClick={() => setShowDistributeModal(true)}
            className="px-3.5 py-2 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Zap className="w-4 h-4" /> Distribuir ({unassignedCount} livres)
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-brand-dark p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg transition ${statusFilter === 'all' ? 'bg-white dark:bg-brand-darkCard text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Todos ({contacts.length})
            </button>
            <button
              onClick={() => setStatusFilter('unassigned')}
              className={`px-2.5 py-1.5 rounded-lg transition ${statusFilter === 'unassigned' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-500'}`}
            >
              Livres ({unassignedCount})
            </button>
            <button
              onClick={() => setStatusFilter('novo')}
              className={`px-2.5 py-1.5 rounded-lg transition ${statusFilter === 'novo' ? 'bg-blue-500 text-white shadow-xs' : 'text-slate-500'}`}
            >
              Novos
            </button>
            <button
              onClick={() => setStatusFilter('pendente')}
              className={`px-2.5 py-1.5 rounded-lg transition ${statusFilter === 'pendente' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500'}`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter('concluido')}
              className={`px-2.5 py-1.5 rounded-lg transition ${statusFilter === 'concluido' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500'}`}
            >
              Vendas
            </button>
          </div>

          {/* Reseller filter */}
          <select
            value={resellerFilter}
            onChange={(e) => setResellerFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold text-slate-700 dark:text-zinc-300 outline-none"
          >
            <option value="all">Todos os Revendedores</option>
            {resellers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome_completo || r.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Batch Actions Bar if any */}
      {selectedLeadIds.length > 0 && (
        <div className="bg-brand-red/10 border border-brand-red/20 p-3 rounded-2xl flex items-center justify-between animate-in fade-in duration-150">
          <span className="text-xs font-bold text-brand-red">
            {selectedLeadIds.length} lead(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDistributeModal(true)}
              className="px-3 py-1.5 bg-brand-red text-white text-xs font-bold rounded-xl hover:bg-brand-redHover flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Distribuir Selecionados
            </button>
            <button
              onClick={() => handleDeleteLeads(selectedLeadIds)}
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50/75 dark:bg-brand-dark/50 text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredContacts.length > 0 && selectedLeadIds.length === filteredContacts.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="py-3 px-4">Lead / Contato</th>
                <th className="py-3 px-4">Telefone / WhatsApp</th>
                <th className="py-3 px-4">Status no Funil</th>
                <th className="py-3 px-4">Revendedor Responsável</th>
                <th className="py-3 px-4">Observações</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-lightBorder dark:divide-brand-darkBorder text-xs">
              {filteredContacts.map((c) => {
                const isSelected = selectedLeadIds.includes(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-brand-dark/40 transition ${
                      isSelected ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(c.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-brand-dark text-slate-600 dark:text-zinc-300 font-bold flex items-center justify-center text-xs">
                          {c.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p>{c.nome}</p>
                          <span className="text-[10px] font-normal text-slate-400">
                            Criado em {new Date(c.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-zinc-300">
                      {c.telefone}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge
                        status={c.assignment?.status || 'unassigned'}
                        text={
                          !c.assignment
                            ? 'Livre'
                            : c.assignment.status === 'novo'
                            ? 'Novo'
                            : c.assignment.status === 'pendente'
                            ? 'Em Atendimento'
                            : 'Venda Concluída'
                        }
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      {c.assignment?.reseller ? (
                        <span className="font-bold text-slate-900 dark:text-white">
                          {c.assignment.reseller.nome_completo || c.assignment.reseller.email}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Não distribuído</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-500">
                      {c.observacoes || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteLeads([c.id])}
                        className="p-1.5 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition text-slate-400"
                        title="Excluir Lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredContacts.length === 0 && (
          <EmptyState
            icon={<Layers className="w-8 h-8 text-slate-400" />}
            title="Nenhum lead encontrado"
            description="Importe uma planilha ou cadastre novos contatos manualmente."
            actionLabel="Importar Planilha"
            onAction={() => setShowImportModal(true)}
          />
        )}
      </div>

      {/* Distribute Modal */}
      {showDistributeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-lightBorder dark:border-brand-darkBorder">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-red" /> Distribuir Leads para Revendedores
              </h3>
              <button onClick={() => setShowDistributeModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <p className="text-slate-600 dark:text-zinc-300">
                Você está prestes a distribuir{' '}
                <b>{selectedLeadIds.length > 0 ? selectedLeadIds.length : unassignedCount}</b> lead(s) livres.
              </p>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Método de Distribuição:
                </label>
                <select
                  value={distributeTargetReseller}
                  onChange={(e) => setDistributeTargetReseller(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold text-slate-800 dark:text-zinc-200 outline-none"
                >
                  <option value="auto">⚡ Distribuir Igualmente entre todos os Revendedores Ativos</option>
                  <optgroup label="Ou atribuir para um revendedor específico:">
                    {resellers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome_completo || r.email} (Cota: {r.lead_quota || 20})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder">
                <button
                  type="button"
                  onClick={() => setShowDistributeModal(false)}
                  className="px-4 py-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder text-slate-600 dark:text-zinc-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDistributeLeads}
                  disabled={distributing}
                  className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-redHover text-white font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {distributing ? 'Distribuindo...' : 'Confirmar Distribuição'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-lightBorder dark:border-brand-darkBorder">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" /> Importar Planilha de Leads
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <p className="text-slate-500">
                Selecione um arquivo <b>.CSV</b> ou <b>.XLSX</b> contendo as colunas de <code>Nome</code> e <code>Telefone</code>.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-6 text-center cursor-pointer hover:border-brand-red transition bg-slate-50/50 dark:bg-brand-dark/50"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-zinc-300">
                  {importFile ? importFile.name : 'Clique para selecionar o arquivo do seu computador'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Formatos suportados: CSV, XLSX, XLS</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {importPreview.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Prévia das primeiras 5 linhas:
                  </h4>
                  <div className="bg-slate-100 dark:bg-brand-dark p-2 rounded-xl text-[10px] font-mono overflow-x-auto max-h-32">
                    <pre>{JSON.stringify(importPreview, null, 2)}</pre>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder text-slate-600 dark:text-zinc-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={!importFile || importLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {importLoading ? 'Processando...' : 'Iniciar Importação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Single Lead Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-lightBorder dark:border-brand-darkBorder">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-red" /> Cadastrar Novo Lead
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Nome do Cliente / Contato
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={newLeadData.nome}
                  onChange={(e) => setNewLeadData({ ...newLeadData, nome: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Telefone / WhatsApp (com DDD)
                </label>
                <input
                  type="text"
                  required
                  placeholder="(32) 99999-9999"
                  value={newLeadData.telefone}
                  onChange={(e) => setNewLeadData({ ...newLeadData, telefone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Observações / Notas Comerciais
                </label>
                <textarea
                  rows={3}
                  placeholder="Interesse em plano trimestral, usuário de smart tv..."
                  value={newLeadData.observacoes}
                  onChange={(e) => setNewLeadData({ ...newLeadData, observacoes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder text-slate-600 dark:text-zinc-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-redHover text-white font-bold"
                >
                  Cadastrar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
