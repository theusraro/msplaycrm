import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Contact, Profile, ContactAssignment, LeadStatus } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { logAuditEvent } from '../../services/auditService';
import { useToast } from '../../contexts/ToastContext';
import {
  Inbox,
  Upload,
  UserCheck,
  Search,
  Filter,
  Users,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  User,
  Plus,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const LeadsView: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [resellers, setResellers] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<ContactAssignment[]>([]);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resellerFilter, setResellerFilter] = useState<string>('all');
  const [followupFilter, setFollowupFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming'>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Seleção múltipla para redistribuição em lote
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [batchTargetReseller, setBatchTargetReseller] = useState<string>('round_robin');
  const [isDistributing, setIsDistributing] = useState(false);

  // Modal de Importação de Arquivo
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetReseller, setImportTargetReseller] = useState<string>('round_robin');
  const [importOrigin, setImportOrigin] = useState<string>('Lista importada');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgressText, setImportProgressText] = useState('');

  // Modal de Limpeza de Atribuições
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Revendedores ativos
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'user')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      if (profilesData) setResellers(profilesData);

      // 2. Contatos com suas atribuições
      const { data: contactsData, error: contactsErr } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (contactsErr) throw contactsErr;

      // 3. Atribuições
      const { data: assignmentsData, error: assignErr } = await supabase
        .from('contact_assignments')
        .select('*, profiles (id, nome, email)');
      if (assignErr) throw assignErr;

      setContacts(contactsData || []);
      setAssignments(assignmentsData || []);
    } catch (err: any) {
      console.error('Erro ao carregar leads:', err);
      toastError(`Erro ao carregar leads: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Mapeamento de Contato -> Atribuição / Responsável
  const contactsWithAssignments = useMemo(() => {
    const assignmentMap = new Map<string, ContactAssignment>();
    assignments.forEach((a) => {
      assignmentMap.set(a.contact_id, a);
    });

    return contacts.map((c) => {
      const a = assignmentMap.get(c.id);
      return {
        ...c,
        assignment: a,
        status: a?.status || 'sem_atribuicao',
        resellerName: a?.profiles?.nome || 'Sem responsável',
        resellerId: a?.user_id || null,
      };
    });
  }, [contacts, assignments]);

  // Filtragem
  const filteredContacts = useMemo(() => {
    const today = new Date().toDateString();
    const now = new Date();

    return contactsWithAssignments.filter((item) => {
      // Busca
      const matchesSearch =
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.telefone.includes(searchTerm) ||
        (item.resellerName && item.resellerName.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'sem_atribuicao' && item.assignment) return false;
        if (statusFilter !== 'sem_atribuicao' && item.status !== statusFilter) return false;
      }

      // Revendedor
      if (resellerFilter !== 'all') {
        if (resellerFilter === 'none' && item.resellerId) return false;
        if (resellerFilter !== 'none' && item.resellerId !== resellerFilter) return false;
      }

      // Origem
      if (originFilter !== 'all' && item.origem !== originFilter) return false;

      // Follow-up
      if (followupFilter !== 'all') {
        if (!item.next_followup_at) return false;
        const fDate = new Date(item.next_followup_at);
        if (followupFilter === 'today') {
          return fDate.toDateString() === today;
        } else if (followupFilter === 'overdue') {
          return fDate < now && fDate.toDateString() !== today;
        } else if (followupFilter === 'upcoming') {
          return fDate > now && fDate.toDateString() !== today;
        }
      }

      return true;
    });
  }, [contactsWithAssignments, searchTerm, statusFilter, resellerFilter, followupFilter, originFilter]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / itemsPerPage));
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selecionar todos os visíveis
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedContactIds(paginatedContacts.map((c) => c.id));
    } else {
      setSelectedContactIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Processar importação de arquivo (CSV, XLSX, TXT)
  const processImportData = async (rawRows: any[]) => {
    setIsImporting(true);
    setImportProgressText('Formatando dados...');

    try {
      const validContacts = rawRows
        .map((c) => {
          const rawName =
            c['Saved Name'] || c['Public Name'] || c['Nome'] || c['name'] || c.Name || c[0] || '';
          const rawPhone =
            c['Phone Number'] || c['Formatted Phone'] || c['Telefone'] || c['phone'] || c[1] || '';
          const rawObs = c['Observações'] || c['Observacao'] || c['Notes'] || '';

          return {
            nome: String(rawName).trim() || 'Desconhecido',
            telefone: String(rawPhone).replace(/\D/g, ''),
            origem: importOrigin || 'Lista importada',
            observacoes: rawObs ? String(rawObs).trim() : 'Importação MSPLAY',
          };
        })
        .filter((c) => c.telefone.length >= 10 && c.telefone.length <= 15);

      const uniqueContacts = Array.from(new Map(validContacts.map((item) => [item.telefone, item])).values());

      if (uniqueContacts.length === 0) {
        toastError('Nenhum contato válido encontrado com telefone.');
        setIsImporting(false);
        return;
      }

      setImportProgressText(`Salvando ${uniqueContacts.length} contatos no banco...`);

      const { data: savedContacts, error: insertErr } = await supabase
        .from('contacts')
        .insert(uniqueContacts)
        .select();

      if (insertErr || !savedContacts) {
        throw new Error(insertErr?.message || 'Erro ao inserir contatos');
      }

      // Distribuição conforme regra selecionada
      const activeResellersList = resellers.filter((r) => r.ativo);
      const assignmentsToInsert: any[] = [];

      if (importTargetReseller === 'round_robin' && activeResellersList.length > 0) {
        setImportProgressText(`Distribuindo via Round Robin entre ${activeResellersList.length} revendedores...`);
        savedContacts.forEach((c, i) => {
          const targetUser = activeResellersList[i % activeResellersList.length];
          assignmentsToInsert.push({
            contact_id: c.id,
            user_id: targetUser.id,
            status: 'novo',
          });
        });
      } else if (importTargetReseller === 'all' && activeResellersList.length > 0) {
        setImportProgressText(`Atribuindo para todos os ${activeResellersList.length} revendedores...`);
        savedContacts.forEach((c) => {
          activeResellersList.forEach((u) => {
            assignmentsToInsert.push({
              contact_id: c.id,
              user_id: u.id,
              status: 'novo',
            });
          });
        });
      } else if (importTargetReseller !== 'none' && importTargetReseller !== 'round_robin' && importTargetReseller !== 'all') {
        setImportProgressText(`Atribuindo para revendedor selecionado...`);
        savedContacts.forEach((c) => {
          assignmentsToInsert.push({
            contact_id: c.id,
            user_id: importTargetReseller,
            status: 'novo',
          });
        });
      }

      if (assignmentsToInsert.length > 0) {
        await supabase.from('contact_assignments').insert(assignmentsToInsert);
      }

      // Gravar log de auditoria
      await logAuditEvent({
        acao: 'Importação de Leads',
        entidade: 'contacts',
        detalhes: {
          totalImportados: savedContacts.length,
          regraDistribuicao: importTargetReseller,
          atribuicoesGeradas: assignmentsToInsert.length,
        },
      });

      success(`${savedContacts.length} contatos importados com sucesso!`);
      setIsImportModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Erro na importação:', err);
      toastError(`Erro ao importar: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt === 'csv' || fileExt === 'txt') {
      Papa.parse(file, {
        complete: (res: any) => processImportData(res.data),
        header: true,
        skipEmptyLines: true,
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        processImportData(data);
      };
      reader.readAsBinaryString(file);
    } else {
      toastError('Formato inválido. Selecione um arquivo CSV, Excel (.xlsx/.xls) ou TXT.');
    }
  };

  // Redistribuição em Lote dos Leads Selecionados
  const handleBatchDistribute = async () => {
    if (selectedContactIds.length === 0) return;
    setIsDistributing(true);

    try {
      // 1. Remover atribuições antigas dos contatos selecionados
      await supabase
        .from('contact_assignments')
        .delete()
        .in('contact_id', selectedContactIds);

      // 2. Criar novas atribuições
      const activeResellersList = resellers.filter((r) => r.ativo);
      const newAssignments: any[] = [];

      if (batchTargetReseller === 'round_robin' && activeResellersList.length > 0) {
        selectedContactIds.forEach((cId, i) => {
          const user = activeResellersList[i % activeResellersList.length];
          newAssignments.push({
            contact_id: cId,
            user_id: user.id,
            status: 'novo',
          });
        });
      } else if (batchTargetReseller !== 'none') {
        selectedContactIds.forEach((cId) => {
          newAssignments.push({
            contact_id: cId,
            user_id: batchTargetReseller,
            status: 'novo',
          });
        });
      }

      if (newAssignments.length > 0) {
        await supabase.from('contact_assignments').insert(newAssignments);
      }

      await logAuditEvent({
        acao: 'Redistribuição de Leads em Lote',
        entidade: 'contact_assignments',
        detalhes: {
          leadsCount: selectedContactIds.length,
          destino: batchTargetReseller,
        },
      });

      success(`${selectedContactIds.length} leads redistribuídos com sucesso!`);
      setSelectedContactIds([]);
      setIsDistributeModalOpen(false);
      fetchData();
    } catch (err: any) {
      toastError(`Erro ao redistribuir: ${err.message}`);
    } finally {
      setIsDistributing(false);
    }
  };

  // Limpeza de todas as atribuições
  const handleClearAllAssignments = async () => {
    try {
      await supabase.from('contact_assignments').delete().not('id', 'is', null);

      await logAuditEvent({
        acao: 'Desatribuição Geral de Leads',
        entidade: 'contact_assignments',
        detalhes: { totalRemovido: assignments.length },
      });

      success('Todas as atribuições de leads foram removidas!');
      setIsClearConfirmOpen(false);
      fetchData();
    } catch (err: any) {
      toastError(`Erro ao limpar atribuições: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Gestão & Distribuição de Leads"
        subtitle="Gerencie a base de contatos, realize importações e distribua oportunidades para os revendedores."
        icon={Inbox}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsClearConfirmOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-rose-900/60 bg-rose-950/20 px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Desatribuir Todos</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-red/20 transition-all hover:bg-brand-redHover active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Planilha</span>
            </button>
          </div>
        }
      />

      {/* Barra de Filtros e Busca Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#121212] p-4 rounded-2xl border border-zinc-800">
        {/* Busca */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, revendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-brand-red focus:outline-none"
          />
        </div>

        {/* Filtro Status */}
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-brand-red focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="sem_atribuicao">? Sem Responsável (Livre)</option>
            <option value="novo">Novo Lead</option>
            <option value="em_contato">Em Contato</option>
            <option value="pendente">Pendente</option>
            <option value="concluido">Venda Concluída</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>

        {/* Filtro Revendedor */}
        <div className="md:col-span-3">
          <select
            value={resellerFilter}
            onChange={(e) => setResellerFilter(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-brand-red focus:outline-none"
          >
            <option value="all">Todos os Revendedores</option>
            <option value="none">Apenas Sem Responsável</option>
            {resellers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Follow-up */}
        <div className="md:col-span-2">
          <select
            value={followupFilter}
            onChange={(e) => setFollowupFilter(e.target.value as any)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-brand-red focus:outline-none"
          >
            <option value="all">Follow-ups: Todos</option>
            <option value="today">?? Para Hoje</option>
            <option value="overdue">?? Atrasados</option>
            <option value="upcoming">? Próximos</option>
          </select>
        </div>
      </div>

      {/* Ações em Lote quando houver seleção */}
      {selectedContactIds.length > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-brand-red/10 border border-brand-red/30 text-xs font-bold animate-in fade-in duration-150">
          <span className="text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-red" />
            {selectedContactIds.length} leads selecionados
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDistributeModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-red hover:bg-brand-redHover px-3 py-1.5 text-white shadow-md transition"
            >
              <Shuffle className="w-3.5 h-3.5" /> Redistribuir Selecionados
            </button>
            <button
              onClick={() => setSelectedContactIds([])}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* Tabela de Leads */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121212] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 uppercase text-[11px] select-none">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedContacts.length > 0 &&
                      selectedContactIds.length === paginatedContacts.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-zinc-700 bg-zinc-800 text-brand-red focus:ring-0"
                  />
                </th>
                <th className="py-3.5 px-4 font-semibold">Nome do Lead</th>
                <th className="py-3.5 px-4 font-semibold">Telefone</th>
                <th className="py-3.5 px-4 font-semibold">Origem</th>
                <th className="py-3.5 px-4 font-semibold">Responsável</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Data de Entrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-red mx-auto mb-2" />
                    Carregando leads da base...
                  </td>
                </tr>
              ) : paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Nenhum lead encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className={`hover:bg-zinc-900/40 transition ${
                      selectedContactIds.includes(contact.id) ? 'bg-brand-red/5' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedContactIds.includes(contact.id)}
                        onChange={() => handleSelectOne(contact.id)}
                        className="rounded border-zinc-700 bg-zinc-800 text-brand-red focus:ring-0"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{contact.nome}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-mono text-[11px]">
                      {contact.telefone}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                        {contact.origem || 'Lista importada'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {contact.resellerId ? (
                        <span className="font-bold text-brand-red flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          {contact.resellerName}
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">Sem responsável</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge type="lead" value={contact.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-500 font-medium">
                      {new Date(contact.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {filteredContacts.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-zinc-800/80 bg-zinc-900/30 text-xs text-zinc-400">
            <span>
              Mostrando {Math.min(filteredContacts.length, (currentPage - 1) * itemsPerPage + 1)} a{' '}
              {Math.min(filteredContacts.length, currentPage * itemsPerPage)} de {filteredContacts.length} leads
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-white px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Importação de Contatos */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Upload className="w-5 h-5 text-brand-red" /> Importar Planilha de Leads
            </h3>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Carregue arquivos CSV, Excel (.xlsx/.xls) ou TXT com colunas de Nome e Telefone.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Origem dos Leads:</label>
                <select
                  value={importOrigin}
                  onChange={(e) => setImportOrigin(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                >
                  <option value="Lista importada">Lista importada</option>
                  <option value="Facebook">Facebook Ads</option>
                  <option value="Instagram">Instagram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Regra de Atribuição Inicial:</label>
                <select
                  value={importTargetReseller}
                  onChange={(e) => setImportTargetReseller(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                >
                  <option value="round_robin">? Distribuir Igualmente p/ Revendedores Ativos (Round Robin)</option>
                  <option value="none">Não Atribuir (Manter sem responsável na base)</option>
                  <option value="all">Atribuir para TODOS os revendedores</option>
                  <optgroup label="Revendedor Específico">
                    {resellers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Área de Upload */}
              <div className="relative border-2 border-dashed border-brand-red/40 hover:border-brand-red rounded-2xl p-8 text-center bg-zinc-900/30 hover:bg-brand-red/5 transition cursor-pointer">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls, .txt"
                  disabled={isImporting}
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileSpreadsheet className="w-10 h-10 text-brand-red mx-auto mb-2" />
                <p className="font-bold text-white text-sm">Clique ou arraste o arquivo aqui</p>
                <p className="text-zinc-500 text-[11px] mt-1">Suporta CSV, Excel e TXT</p>
              </div>

              {isImporting && (
                <div className="flex items-center justify-center gap-2 py-3 text-brand-red font-bold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{importProgressText || 'Processando arquivo...'}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isImporting}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Redistribuição em Lote */}
      {isDistributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-brand-red" /> Redistribuir {selectedContactIds.length} Leads
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Escolha para quem deseja atribuir os leads selecionados.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Destino da Distribuição:</label>
                <select
                  value={batchTargetReseller}
                  onChange={(e) => setBatchTargetReseller(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                >
                  <option value="round_robin">? Distribuir Igualmente entre Ativos (Round Robin)</option>
                  <option value="none">Remover Atribuição (Deixar livres)</option>
                  <optgroup label="Atribuir a Revendedor Específico">
                    {resellers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  disabled={isDistributing}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleBatchDistribute}
                  disabled={isDistributing}
                  className="rounded-xl bg-brand-red hover:bg-brand-redHover px-4 py-2 font-bold text-white shadow-lg shadow-brand-red/20 transition flex items-center gap-2"
                >
                  {isDistributing ? 'Distribuindo...' : 'Confirmar Redistribuição'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de Limpeza de Atribuições */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        title="Desatribuir TODOS os leads?"
        message="ATENÇÃO: Esta ação removerá os contatos atribuídos de TODOS os revendedores simultaneamente. Os contatos continuarão salvos na base geral e poderão ser redistribuídos. Deseja prosseguir?"
        confirmLabel="Sim, Desatribuir Todos"
        isDestructive={true}
        onConfirm={handleClearAllAssignments}
        onCancel={() => setIsClearConfirmOpen(false)}
      />
    </div>
  );
};
