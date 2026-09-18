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
  ArrowRight,
  Users,
  CheckSquare
} from 'lucide-react';

export interface AssignmentInfo {
  id: string;
  contact_id: string;
  user_id: string;
  status: 'novo' | 'pendente' | 'concluido' | string;
  assigned_at: string;
  reseller?: {
    nome_completo?: string;
    email: string;
  };
}

export interface ContactWithAssignments extends Contact {
  assignments: AssignmentInfo[];
}

export const LeadsView: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactWithAssignments[]>([]);
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

  // Distribution / Assignment Multi-reseller state
  const [selectedResellerIds, setSelectedResellerIds] = useState<string[]>([]);
  const [distributionMode, setDistributionMode] = useState<'assign_all' | 'round_robin'>('assign_all');
  const [distributing, setDistributing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsRes, assignmentsRes, resellersRes] = await Promise.all([
        supabase.from('contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('contact_assignments').select('*, profiles:user_id(nome_completo, email)'),
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'reseller')
          .eq('ativo', true)
      ]);

      const cList = contactsRes.data || [];
      const aList = assignmentsRes.data || [];
      setResellers(resellersRes.data || []);

      // Merge ALL assignments into contacts (1:N relationship)
      const merged: ContactWithAssignments[] = cList.map((c: any) => {
        const contactAssigns: AssignmentInfo[] = aList
          .filter((a: any) => a.contact_id === c.id)
          .map((a: any) => ({
            id: a.id,
            contact_id: a.contact_id,
            user_id: a.user_id,
            status: a.status || 'novo',
            assigned_at: a.assigned_at,
            reseller: a.profiles
          }));

        return {
          ...c,
          assignments: contactAssigns
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
      matchStatus = c.assignments.length === 0;
    } else if (statusFilter !== 'all') {
      matchStatus = c.assignments.some((a) => a.status === statusFilter);
    }

    let matchReseller = true;
    if (resellerFilter !== 'all') {
      matchReseller = c.assignments.some((a) => a.user_id === resellerFilter);
    }

    return matchSearch && matchStatus && matchReseller;
  });

  const unassignedCount = contacts.filter((c) => c.assignments.length === 0).length;

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
        .insert([{
          nome: newLeadData.nome.trim(),
          telefone: newLeadData.telefone.trim(),
          observacoes: newLeadData.observacoes.trim(),
          origem: newLeadData.origem || 'manual'
        }])
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
    if (!confirm(`Deseja realmente excluir ${ids.length} lead(s) selecionado(s)?`)) return;

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

  // File Import Handling with Multi-format parser (CSV, XLSX, TXT, VCF) and phone normalization
  const [importStats, setImportStats] = useState<{
    total: number;
    validNew: FormattedContact[];
    existingCount: number;
    invalidCount: number;
  } | null>(null);

  interface FormattedContact {
    nome: string;
    telefone: string;
    observacoes: string;
    origem: string;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportStats(null);
    const fileName = file.name.toLowerCase();

    try {
      let rawItems: { nome: string; telefone: string; observacoes?: string }[] = [];

      if (fileName.endsWith('.vcf')) {
        const text = await file.text();
        const parsed = (await import('../../utils/vcfParser')).parseVCard(text);
        rawItems = parsed;
        setImportPreview(parsed.slice(0, 5));
      } else if (fileName.endsWith('.txt')) {
        const text = await file.text();
        const parsed = (await import('../../utils/vcfParser')).parsePlainTextContacts(text);
        rawItems = parsed;
        setImportPreview(parsed.slice(0, 5));
      } else if (fileName.endsWith('.csv')) {
        await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              const rows = results.data || [];
              setImportPreview(rows.slice(0, 5));
              rawItems = rows.map((row: any) => ({
                nome: row.nome || row.Nome || row.name || row.Name || row.Cliente || row.cliente || '',
                telefone: row.telefone || row.Telefone || row.phone || row.Phone || row.WhatsApp || row.whatsapp || row.Celular || row.celular || '',
                observacoes: row.observacoes || row.Observacoes || row.notas || row.Notas || row.obs || row.Obs || ''
              }));
              resolve(true);
            },
            error: reject
          });
        });
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        setImportPreview(rows.slice(0, 5));
        rawItems = rows.map((row: any) => ({
          nome: row.nome || row.Nome || row.name || row.Name || row.Cliente || row.cliente || '',
          telefone: row.telefone || row.Telefone || row.phone || row.Phone || row.WhatsApp || row.whatsapp || row.Celular || row.celular || '',
          observacoes: row.observacoes || row.Observacoes || row.notas || row.Notas || row.obs || row.Obs || ''
        }));
      }

      // Analisar telefones existentes no banco para detectar duplicados
      const { normalizeBrazilianPhone } = await import('../../utils/phoneNormalizer');
      const existingPhones = new Set<string>();
      contacts.forEach((c) => {
        const norm = normalizeBrazilianPhone(c.telefone);
        if (norm.isValid) existingPhones.add(norm.cleanDigits);
        else existingPhones.add(c.telefone.replace(/\D/g, ''));
      });

      const validNew: FormattedContact[] = [];
      let existingCount = 0;
      let invalidCount = 0;
      const seenInBatch = new Set<string>();

      rawItems.forEach((item) => {
        const rawNome = String(item.nome || '').trim();
        const rawTel = String(item.telefone || '').trim();
        const rawObs = String(item.observacoes || '').trim();

        if (!rawTel) {
          invalidCount++;
          return;
        }

        const normalized = normalizeBrazilianPhone(rawTel);
        if (!normalized.isValid) {
          invalidCount++;
          return;
        }

        if (existingPhones.has(normalized.cleanDigits) || seenInBatch.has(normalized.cleanDigits)) {
          existingCount++;
          return;
        }

        seenInBatch.add(normalized.cleanDigits);
        validNew.push({
          nome: rawNome || `Lead ${normalized.cleanDigits.slice(-4)}`,
          telefone: normalized.formatted,
          observacoes: rawObs,
          origem: fileName.endsWith('.vcf') ? 'import_vcf' : fileName.endsWith('.txt') ? 'import_txt' : 'import_csv'
        });
      });

      setImportStats({
        total: rawItems.length,
        validNew,
        existingCount,
        invalidCount
      });
    } catch (err: any) {
      addToast('Erro ao processar arquivo: ' + err.message, 'error');
    }
  };

  const handleExecuteImport = async () => {
    if (!importStats || importStats.validNew.length === 0) {
      addToast('Nenhum novo lead válido para importar.', 'warning');
      return;
    }
    setImportLoading(true);

    try {
      const itemsToInsert = importStats.validNew;

      // Inserir em lotes de 100
      for (let i = 0; i < itemsToInsert.length; i += 100) {
        const chunk = itemsToInsert.slice(i, i + 100);
        const { error } = await supabase.from('contacts').insert(chunk);
        if (error) throw error;
      }

      await logAuditEvent('import_leads', {
        count: itemsToInsert.length,
        filename: importFile?.name,
        existing_duplicates_ignored: importStats.existingCount,
        invalid_ignored: importStats.invalidCount
      });

      let msg = `${itemsToInsert.length} novo(s) lead(s) importado(s) com sucesso!`;
      if (importStats.existingCount > 0) {
        msg += ` (${importStats.existingCount} duplicados ignorados)`;
      }
      addToast(msg, 'success');

      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
      setImportStats(null);
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
      Status: c.assignments.length === 0 ? 'Livre' : c.assignments.map((a) => a.status).join('; '),
      Revendedores: c.assignments.length === 0
        ? 'Não distribuído'
        : c.assignments.map((a) => a.reseller?.nome_completo || a.reseller?.email).join('; '),
      TotalRevendedores: c.assignments.length,
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

  // Distribution / Multi-reseller Assignment Algorithm
  const handleDistributeLeads = async () => {
    if (resellers.length === 0) {
      addToast('Não há revendedores ativos cadastrados para receber leads.', 'warning');
      return;
    }

    if (selectedResellerIds.length === 0) {
      addToast('Selecione pelo menos um revendedor na lista.', 'warning');
      return;
    }

    const targetLeads = selectedLeadIds.length > 0
      ? contacts.filter((c) => selectedLeadIds.includes(c.id))
      : contacts;

    if (targetLeads.length === 0) {
      addToast('Nenhum lead disponível para a atribuição.', 'warning');
      return;
    }

    setDistributing(true);
    try {
      // Buscar assignments existentes no banco para checar duplicidade de (contact_id, user_id)
      const { data: existingData, error: fetchErr } = await supabase
        .from('contact_assignments')
        .select('contact_id, user_id');

      if (fetchErr) throw fetchErr;

      const existingSet = new Set<string>();
      (existingData || []).forEach((item: any) => {
        existingSet.add(`${item.contact_id}:${item.user_id}`);
      });

      const toInsert: {
        contact_id: string;
        user_id: string;
        status: string;
        assigned_at: string;
      }[] = [];

      let alreadyExistsCount = 0;

      if (distributionMode === 'assign_all') {
        // Modo A: Atribuir para todos os revendedores selecionados (produto cartesiano)
        for (const lead of targetLeads) {
          for (const resellerId of selectedResellerIds) {
            const key = `${lead.id}:${resellerId}`;
            if (existingSet.has(key)) {
              alreadyExistsCount++;
            } else {
              existingSet.add(key); // Evita duplicata interna no lote
              toInsert.push({
                contact_id: lead.id,
                user_id: resellerId,
                status: 'novo',
                assigned_at: new Date().toISOString()
              });
            }
          }
        }
      } else {
        // Modo B: Distribuir alternadamente entre os revendedores selecionados (Round Robin)
        let rIndex = 0;
        for (const lead of targetLeads) {
          const targetResellerId = selectedResellerIds[rIndex % selectedResellerIds.length];
          rIndex++;

          const key = `${lead.id}:${targetResellerId}`;
          if (existingSet.has(key)) {
            alreadyExistsCount++;
          } else {
            existingSet.add(key);
            toInsert.push({
              contact_id: lead.id,
              user_id: targetResellerId,
              status: 'novo',
              assigned_at: new Date().toISOString()
            });
          }
        }
      }

      if (toInsert.length === 0) {
        if (alreadyExistsCount > 0) {
          addToast(
            'Todos os leads selecionados já estão atribuídos aos revendedores selecionados.',
            'info'
          );
        } else {
          addToast('Nenhuma nova atribuição necessária.', 'info');
        }
        setShowDistributeModal(false);
        return;
      }

      // Inserir novos assignments em lotes de 100
      for (let i = 0; i < toInsert.length; i += 100) {
        const chunk = toInsert.slice(i, i + 100);
        const { error } = await supabase.from('contact_assignments').insert(chunk);
        if (error) throw error;
      }

      await logAuditEvent('distribute_leads', {
        count: toInsert.length,
        mode: distributionMode,
        resellers_count: selectedResellerIds.length,
        target_leads: targetLeads.length,
        ignored_existing: alreadyExistsCount
      });

      let msg = `${toInsert.length} nova(s) atribuição(ões) realizada(s).`;
      if (alreadyExistsCount > 0) {
        msg += ` ${alreadyExistsCount} combinação(ões) já existia(m) e foi(ram) ignorada(s).`;
      }

      addToast(msg, 'success');
      setShowDistributeModal(false);
      setSelectedLeadIds([]);
      setSelectedResellerIds([]);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao atribuir leads', 'error');
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
            Importe listas CSV/Excel, gerencie o funil e atribua o mesmo lead para múltiplos revendedores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-xs font-semibold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-sm hover:bg-slate-50 dark:hover:bg-brand-dark"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard hover:bg-slate-50 dark:hover:bg-brand-dark text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-blue-500" /> Importar Planilha
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard hover:bg-slate-50 dark:hover:bg-brand-dark text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" /> Exportar CSV
          </button>
          <button
            onClick={() => {
              if (selectedResellerIds.length === 0 && resellers.length > 0) {
                setSelectedResellerIds(resellers.map((r) => r.id));
              }
              setShowDistributeModal(true);
            }}
            className="px-3.5 py-2 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Zap className="w-4 h-4" /> Atribuir / Distribuir Leads
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
              onClick={() => {
                if (selectedResellerIds.length === 0 && resellers.length > 0) {
                  setSelectedResellerIds(resellers.map((r) => r.id));
                }
                setShowDistributeModal(true);
              }}
              className="px-3 py-1.5 bg-brand-red text-white text-xs font-bold rounded-xl hover:bg-brand-redHover flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Atribuir Selecionados
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
                <th className="py-3 px-4">Revendedor(es) Responsável(is)</th>
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
                      {c.assignments.length === 0 ? (
                        <StatusBadge status="unassigned" text="Livre" />
                      ) : c.assignments.length === 1 ? (
                        <StatusBadge
                          status={c.assignments[0].status}
                          text={
                            c.assignments[0].status === 'novo'
                              ? 'Novo'
                              : c.assignments[0].status === 'pendente'
                              ? 'Em Atendimento'
                              : 'Venda Concluída'
                          }
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <StatusBadge
                            status={c.assignments[0].status}
                            text={
                              c.assignments[0].status === 'novo'
                                ? 'Novo'
                                : c.assignments[0].status === 'pendente'
                                ? 'Em Atendimento'
                                : 'Venda Concluída'
                            }
                          />
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-[10px]"
                            title={`${c.assignments.length} revendedores atribuídos`}
                          >
                            {c.assignments.length} revendedores
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.assignments.length === 0 ? (
                        <span className="text-slate-400 italic">Não distribuído</span>
                      ) : c.assignments.length === 1 ? (
                        <span className="font-bold text-slate-900 dark:text-white">
                          {c.assignments[0].reseller?.nome_completo || c.assignments[0].reseller?.email}
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {c.assignments[0].reseller?.nome_completo || c.assignments[0].reseller?.email}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-brand-red/10 text-brand-red font-black text-[10px] cursor-help"
                            title={c.assignments
                              .map((a) => a.reseller?.nome_completo || a.reseller?.email || 'Revendedor')
                              .join(', ')}
                          >
                            +{c.assignments.length - 1}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-500">
                      {c.observacoes || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={async () => {
                            const { openWhatsAppConversation } = await import('../../services/whatsappService');
                            openWhatsAppConversation({ phone: c.telefone });
                          }}
                          className="p-1.5 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 transition text-slate-400"
                          title="Chamar no WhatsApp"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteLeads([c.id])}
                          className="p-1.5 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition text-slate-400"
                          title="Excluir Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* Multi-Reseller Distribute / Assign Modal */}
      {showDistributeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-brand-lightBorder dark:border-brand-darkBorder">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-red" /> Atribuir / Distribuir Leads
              </h3>
              <button
                onClick={() => setShowDistributeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              {/* Target Summary */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-brand-dark border border-brand-lightBorder dark:border-brand-darkBorder">
                <p className="text-slate-700 dark:text-zinc-300">
                  {selectedLeadIds.length > 0 ? (
                    <>
                      Operação com <b>{selectedLeadIds.length}</b> lead(s) selecionado(s) na tabela.
                    </>
                  ) : (
                    <>
                      Operação com <b>todos os {contacts.length}</b> lead(s) cadastrados no sistema.
                    </>
                  )}
                </p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-zinc-300">
                  Escolha o Modo de Atribuição:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setDistributionMode('assign_all')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      distributionMode === 'assign_all'
                        ? 'border-brand-red bg-red-50/50 dark:bg-red-950/20'
                        : 'border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="distributionMode"
                        checked={distributionMode === 'assign_all'}
                        onChange={() => setDistributionMode('assign_all')}
                        className="text-brand-red focus:ring-brand-red"
                      />
                      <span className="font-bold text-slate-900 dark:text-white">Atribuir para todos</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      Cada lead selecionado é atribuído a <b>todos</b> os revendedores marcados.
                    </p>
                  </div>

                  <div
                    onClick={() => setDistributionMode('round_robin')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      distributionMode === 'round_robin'
                        ? 'border-brand-red bg-red-50/50 dark:bg-red-950/20'
                        : 'border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="distributionMode"
                        checked={distributionMode === 'round_robin'}
                        onChange={() => setDistributionMode('round_robin')}
                        className="text-brand-red focus:ring-brand-red"
                      />
                      <span className="font-bold text-slate-900 dark:text-white">Distribuir entre eles</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      Divide a lista de leads <b>igualmente</b> (alternado) entre os revendedores marcados.
                    </p>
                  </div>
                </div>
              </div>

              {/* Resellers Selection List with Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">
                    Revendedores Selecionados ({selectedResellerIds.length} de {resellers.length}):
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedResellerIds(resellers.map((r) => r.id))}
                      className="text-brand-red font-bold hover:underline"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-slate-300 dark:text-zinc-700">&bull;</span>
                    <button
                      type="button"
                      onClick={() => setSelectedResellerIds([])}
                      className="text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300 font-medium"
                    >
                      Limpar seleção
                    </button>
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50/50 dark:bg-brand-dark/50">
                  {resellers.map((r) => {
                    const isSelected = selectedResellerIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedResellerIds(selectedResellerIds.filter((id) => id !== r.id));
                          } else {
                            setSelectedResellerIds([...selectedResellerIds, r.id]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'border-brand-red/50 bg-red-50/70 dark:bg-red-950/30 text-slate-900 dark:text-white'
                            : 'border-brand-lightBorder/50 dark:border-brand-darkBorder/50 bg-white dark:bg-brand-darkCard hover:bg-slate-100 dark:hover:bg-brand-dark text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // event handled by container click
                            className="rounded border-slate-300 text-brand-red focus:ring-brand-red shrink-0"
                          />
                          <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-brand-dark text-slate-700 dark:text-zinc-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {(r.nome_completo || r.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="font-bold truncate text-xs">{r.nome_completo || r.email}</p>
                            <p className="text-[10px] text-slate-400 truncate">{r.email}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-brand-dark text-slate-500 shrink-0 ml-2">
                          Cota: {r.lead_quota || 20}
                        </span>
                      </div>
                    );
                  })}

                  {resellers.length === 0 && (
                    <p className="text-center text-slate-400 py-4 text-xs">
                      Nenhum revendedor ativo disponível no sistema.
                    </p>
                  )}
                </div>
              </div>

              {/* Information & Projection Feedback */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-brand-dark border border-brand-lightBorder dark:border-brand-darkBorder text-[11px] text-slate-600 dark:text-zinc-300 space-y-1">
                <p>
                  ⚡ Projeção:{' '}
                  <b>
                    {distributionMode === 'assign_all'
                      ? (selectedLeadIds.length > 0 ? selectedLeadIds.length : contacts.length) * selectedResellerIds.length
                      : (selectedLeadIds.length > 0 ? selectedLeadIds.length : contacts.length)}
                  </b>{' '}
                  atribuição(ões) potencial(is).
                </p>
                <p className="text-[10px] text-slate-400">
                  {distributionMode === 'assign_all'
                    ? 'Combinações que já existiam anteriormente serão preservadas sem duplicação.'
                    : `Aproximadamente ${
                        selectedResellerIds.length > 0
                          ? Math.ceil(
                              (selectedLeadIds.length > 0 ? selectedLeadIds.length : contacts.length) /
                                selectedResellerIds.length
                            )
                          : 0
                      } lead(s) para cada revendedor marcado.`}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder">
                <button
                  type="button"
                  onClick={() => setShowDistributeModal(false)}
                  className="px-4 py-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder text-slate-600 dark:text-zinc-300 font-bold hover:bg-slate-50 dark:hover:bg-brand-dark"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDistributeLeads}
                  disabled={distributing || selectedResellerIds.length === 0}
                  className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-redHover text-white font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {distributing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Atribuindo...
                    </>
                  ) : (
                    'Confirmar Atribuição'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal with CSV / XLSX / TXT / VCF Parser & Verification */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-brand-lightBorder dark:border-brand-darkBorder">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" /> Importar Contatos / Leads
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <p className="text-slate-500">
                Selecione arquivos <b>.CSV</b>, <b>.XLSX</b>, <b>.TXT</b> ou <b>.VCF (vCard)</b>. Os números de telefone serão automaticamente normalizados no padrão brasileiro com DDD.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-6 text-center cursor-pointer hover:border-brand-red transition bg-slate-50/50 dark:bg-brand-dark/50"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-zinc-300">
                  {importFile ? importFile.name : 'Clique para selecionar o arquivo do seu dispositivo'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Formatos suportados: CSV, XLSX, XLS, TXT, VCF</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls, .txt, .vcf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {importStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-brand-dark text-center border border-brand-lightBorder dark:border-brand-darkBorder">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Lidos</p>
                    <p className="text-base font-black text-slate-900 dark:text-white">{importStats.total}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <p className="text-[10px] font-bold uppercase">Novos Válidos</p>
                    <p className="text-base font-black">{importStats.validNew.length}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-center border border-amber-500/20 text-amber-600 dark:text-amber-400">
                    <p className="text-[10px] font-bold uppercase">Duplicados</p>
                    <p className="text-base font-black">{importStats.existingCount}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-center border border-red-500/20 text-red-600 dark:text-red-400">
                    <p className="text-[10px] font-bold uppercase">Inválidos</p>
                    <p className="text-base font-black">{importStats.invalidCount}</p>
                  </div>
                </div>
              )}

              {importPreview.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Prévia dos primeiros registros:
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
                  className="px-4 py-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder text-slate-600 dark:text-zinc-300 font-bold hover:bg-slate-50 dark:hover:bg-brand-dark"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={!importStats || importStats.validNew.length === 0 || importLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {importLoading ? 'Processando...' : `Importar ${importStats ? importStats.validNew.length : ''} Novos Leads`}
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

