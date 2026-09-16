import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { MetricCard } from '../../components/ui/MetricCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { logAuditEvent } from '../../services/auditService';
import { Sale, Profile, Contact } from '../../types';
import Papa from 'papaparse';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Calendar,
  Search,
  Plus,
  Download,
  RefreshCw,
  X,
  User,
  CheckCircle2
} from 'lucide-react';

export const SalesView: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [resellers, setResellers] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | 'this_month'>('all');
  const [resellerFilter, setResellerFilter] = useState<string>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSaleData, setNewSaleData] = useState({
    user_id: '',
    contact_id: '',
    valor: '',
    plano: 'Mensal Padrão',
    metodo_pagamento: 'pix',
    observacoes: ''
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, resellersRes, contactsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('*, profiles:user_id(nome_completo, email), contacts:contact_id(nome, telefone)')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'reseller'),
        supabase.from('contacts').select('*')
      ]);

      setSales(salesRes.data || []);
      setResellers(resellersRes.data || []);
      setContacts(contactsRes.data || []);
    } catch (err: any) {
      addToast(err.message || 'Erro ao carregar vendas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Sales
  const filteredSales = sales.filter((s) => {
    const resellerName = s.profiles?.nome_completo || s.profiles?.email || '';
    const contactName = s.contacts?.nome || '';
    const matchSearch =
      resellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.plano && s.plano.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchDate = true;
    const saleDate = new Date(s.created_at);
    const now = new Date();

    if (dateFilter === '7d') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchDate = saleDate >= cutoff;
    } else if (dateFilter === '30d') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchDate = saleDate >= cutoff;
    } else if (dateFilter === 'this_month') {
      matchDate = saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    }

    let matchReseller = true;
    if (resellerFilter !== 'all') {
      matchReseller = s.user_id === resellerFilter;
    }

    return matchSearch && matchDate && matchReseller;
  });

  // Calculate Metrics
  const totalRevenue = filteredSales.reduce((acc, s) => acc + Number(s.valor || 0), 0);
  const totalCount = filteredSales.length;
  const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSaleData.valor || !newSaleData.user_id) {
      addToast('Revendedor e valor são obrigatórios', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        user_id: newSaleData.user_id,
        valor: parseFloat(newSaleData.valor.replace(',', '.')),
        plano: newSaleData.plano,
        metodo_pagamento: newSaleData.metodo_pagamento,
        observacoes: newSaleData.observacoes || null
      };

      if (newSaleData.contact_id) {
        payload.contact_id = newSaleData.contact_id;
      }

      const { data, error } = await supabase.from('sales').insert([payload]).select().single();
      if (error) throw error;

      // Also update contact assignment to 'concluido' if contact specified
      if (newSaleData.contact_id) {
        await supabase
          .from('contact_assignments')
          .update({ status: 'concluido' })
          .eq('contact_id', newSaleData.contact_id)
          .eq('user_id', newSaleData.user_id);
      }

      await logAuditEvent('create_sale', {
        sale_id: data.id,
        user_id: newSaleData.user_id,
        valor: payload.valor,
        plano: payload.plano
      });

      addToast('Venda registrada com sucesso!', 'success');
      setShowCreateModal(false);
      setNewSaleData({
        user_id: '',
        contact_id: '',
        valor: '',
        plano: 'Mensal Padrão',
        metodo_pagamento: 'pix',
        observacoes: ''
      });
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Erro ao registrar venda', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredSales.map((s) => ({
      ID: s.id,
      Data: new Date(s.created_at).toLocaleString('pt-BR'),
      Revendedor: s.profiles?.nome_completo || s.profiles?.email || 'N/A',
      Cliente: s.contacts?.nome || 'Venda Avulsa',
      Telefone: s.contacts?.telefone || 'N/A',
      Plano: s.plano || 'Padrão',
      Valor: Number(s.valor || 0).toFixed(2),
      MetodoPagamento: s.metodo_pagamento || 'PIX'
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vendas_msplay_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Relatório de vendas exportado com sucesso', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" /> Registro e Auditoria de Vendas
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Acompanhe a receita gerada, faturamento por revendedor e ticket médio de conversão.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-xs font-semibold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard text-slate-700 dark:text-zinc-300 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard hover:bg-slate-50 text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" /> Exportar Vendas
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Registrar Venda
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Faturamento do Período"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${totalCount} transações aprovadas`}
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
        />
        <MetricCard
          title="Ticket Médio"
          value={`R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Valor médio por assinatura"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="default"
        />
        <MetricCard
          title="Vendas Registradas"
          value={totalCount}
          subtitle="Total de assinaturas convertidas"
          icon={<CreditCard className="w-5 h-5" />}
          variant="default"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por revendedor, cliente ou plano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-brand-dark p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${dateFilter === 'all' ? 'bg-white dark:bg-brand-darkCard text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Tudo
            </button>
            <button
              onClick={() => setDateFilter('7d')}
              className={`px-3 py-1.5 rounded-lg transition ${dateFilter === '7d' ? 'bg-white dark:bg-brand-darkCard text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => setDateFilter('30d')}
              className={`px-3 py-1.5 rounded-lg transition ${dateFilter === '30d' ? 'bg-white dark:bg-brand-darkCard text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Últimos 30 dias
            </button>
            <button
              onClick={() => setDateFilter('this_month')}
              className={`px-3 py-1.5 rounded-lg transition ${dateFilter === 'this_month' ? 'bg-white dark:bg-brand-darkCard text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              Este Mês
            </button>
          </div>

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

      {/* Sales Table */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50/75 dark:bg-brand-dark/50 text-[11px] font-black uppercase text-slate-500 dark:text-zinc-400">
                <th className="py-3 px-4">Data & Horário</th>
                <th className="py-3 px-4">Revendedor</th>
                <th className="py-3 px-4">Cliente / Lead</th>
                <th className="py-3 px-4">Plano Vendido</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-lightBorder dark:divide-brand-darkBorder text-xs">
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-brand-dark/40 transition">
                  <td className="py-3.5 px-4 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(s.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {s.profiles?.nome_completo || s.profiles?.email || 'Desconhecido'}
                  </td>
                  <td className="py-3.5 px-4">
                    {s.contacts ? (
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200">{s.contacts.nome}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{s.contacts.telefone}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Venda Direta / Balcão</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-brand-dark text-[11px] font-semibold">
                      {s.plano || 'Mensal'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-slate-500">
                    {s.metodo_pagamento || 'PIX'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    R$ {Number(s.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <EmptyState
            icon={<DollarSign className="w-8 h-8 text-slate-400" />}
            title="Nenhuma venda encontrada"
            description="Nenhuma transação foi registrada no período selecionado."
            actionLabel="Registrar Venda Manual"
            onAction={() => setShowCreateModal(true)}
          />
        )}
      </div>

      {/* Create Sale Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-lightBorder dark:border-brand-darkBorder">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" /> Registrar Nova Venda
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Revendedor Responsável
                </label>
                <select
                  required
                  value={newSaleData.user_id}
                  onChange={(e) => setNewSaleData({ ...newSaleData, user_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red font-bold"
                >
                  <option value="">Selecione o revendedor...</option>
                  {resellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome_completo || r.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Cliente / Lead (Opcional)
                </label>
                <select
                  value={newSaleData.contact_id}
                  onChange={(e) => setNewSaleData({ ...newSaleData, contact_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
                >
                  <option value="">Nenhum (Venda Avulsa)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.telefone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="35.00"
                    value={newSaleData.valor}
                    onChange={(e) => setNewSaleData({ ...newSaleData, valor: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Método
                  </label>
                  <select
                    value={newSaleData.metodo_pagamento}
                    onChange={(e) => setNewSaleData({ ...newSaleData, metodo_pagamento: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red font-bold"
                  >
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="boleto">Boleto</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Plano / Pacote
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mensal Padrão / Trimestral VIP"
                  value={newSaleData.plano}
                  onChange={(e) => setNewSaleData({ ...newSaleData, plano: e.target.value })}
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
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                >
                  {saving ? 'Registrando...' : 'Confirmar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
