import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Sale, Profile, Contact } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { logAuditEvent } from '../../services/auditService';
import { useToast } from '../../contexts/ToastContext';
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle2,
  Plus,
  Loader2,
  X,
} from 'lucide-react';

export const SalesView: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [resellers, setResellers] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [resellerFilter, setResellerFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | '30days' | 'week'>('all');

  // Modal de Registro Manual de Venda
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [saleValue, setSaleValue] = useState('');
  const [saleObs, setSaleObs] = useState('');
  const [saleOrigin, setSaleOrigin] = useState('WhatsApp');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      // 1. Vendas completas com relacionamento de contatos e perfis
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select('*, contacts (*), profiles (*)')
        .order('created_at', { ascending: false });

      if (salesErr) throw salesErr;

      // 2. Revendedores
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'user')
        .order('nome', { ascending: true });

      // 3. Contatos para seleção
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      setSales(salesData || []);
      setResellers(profilesData || []);
      setContacts(contactsData || []);
    } catch (err: any) {
      console.error('Erro ao carregar vendas:', err);
      toastError(`Erro ao carregar vendas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || !selectedUserId) {
      toastError('Selecione o cliente e o revendedor responsável.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('sales').insert({
        contact_id: selectedContactId,
        user_id: selectedUserId,
        valor: parseFloat(saleValue) || 0.0,
        origem: saleOrigin,
        observacoes: saleObs || 'Registro manual via painel',
        status: 'concluido',
      }).select().single();

      if (error) throw error;

      // Atualizar status da atribuição se existir
      await supabase
        .from('contact_assignments')
        .update({ status: 'concluido' })
        .eq('contact_id', selectedContactId)
        .eq('user_id', selectedUserId);

      await logAuditEvent({
        acao: 'Registro de Venda',
        entidade: 'sales',
        entityId: data?.id,
        detalhes: {
          valor: saleValue,
          origem: saleOrigin,
          revendedorId: selectedUserId,
        },
      });

      success('Venda registrada com sucesso!');
      setIsRegisterModalOpen(false);
      setSelectedContactId('');
      setSelectedUserId('');
      setSaleValue('');
      setSaleObs('');
      fetchSalesData();
    } catch (err: any) {
      toastError(`Erro ao registrar venda: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtragem
  const filteredSales = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return sales.filter((s) => {
      const matchSearch =
        (s.profiles?.nome && s.profiles.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.contacts?.nome && s.contacts.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.contacts?.telefone && s.contacts.telefone.includes(searchTerm));
      if (!matchSearch) return false;

      if (resellerFilter !== 'all' && s.user_id !== resellerFilter) return false;

      const saleDate = new Date(s.created_at);
      if (periodFilter === 'month' && saleDate < firstDayOfMonth) return false;
      if (periodFilter === '30days' && saleDate < last30Days) return false;
      if (periodFilter === 'week' && saleDate < last7Days) return false;

      return true;
    });
  }, [sales, searchTerm, resellerFilter, periodFilter]);

  const totalValue = filteredSales.reduce((acc, s) => acc + Number(s.valor || 0), 0);
  const averageTicket = filteredSales.length > 0 ? (totalValue / filteredSales.length).toFixed(2) : '0.00';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Auditoria & Histórico de Vendas"
        subtitle="Monitore as conversões realizadas pelos revendedores e a receita gerada."
        icon={ShoppingBag}
        actions={
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-red px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-red/20 transition-all hover:bg-brand-redHover active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Venda</span>
          </button>
        }
      />

      {/* Cards de Métricas de Vendas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total de Vendas"
          value={filteredSales.length}
          subtitle="Conversões concluídas"
          icon={CheckCircle2}
          accentColor="text-emerald-400"
          loading={loading}
        />
        <MetricCard
          title="Volume Financeiro"
          value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Faturamento apurado"
          icon={DollarSign}
          accentColor="text-emerald-400"
          loading={loading}
        />
        <MetricCard
          title="Ticket Médio"
          value={`R$ ${averageTicket}`}
          subtitle="Média por conversão"
          icon={TrendingUp}
          accentColor="text-brand-red"
          loading={loading}
        />
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#121212] p-4 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Período */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold">
            {[
              { id: 'all', label: 'Todo o Período' },
              { id: 'month', label: 'Este Mês' },
              { id: '30days', label: 'Últimos 30 Dias' },
              { id: 'week', label: 'Últimos 7 Dias' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodFilter(p.id as any)}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  periodFilter === p.id
                    ? 'bg-brand-red text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Revendedor */}
          <select
            value={resellerFilter}
            onChange={(e) => setResellerFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-brand-red focus:outline-none"
          >
            <option value="all">Todos os Revendedores</option>
            {resellers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Busca */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por cliente, revendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-brand-red focus:outline-none"
          />
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121212] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 uppercase text-[11px] select-none">
                <th className="py-3.5 px-4 font-semibold">Revendedor</th>
                <th className="py-3.5 px-4 font-semibold">Cliente Convertido</th>
                <th className="py-3.5 px-4 font-semibold">Telefone</th>
                <th className="py-3.5 px-4 font-semibold">Origem</th>
                <th className="py-3.5 px-4 font-semibold">Valor</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-red mx-auto mb-2" />
                    Carregando histórico de vendas...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Nenhuma venda encontrada para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-zinc-900/40 transition">
                    <td className="py-3.5 px-4 font-bold text-brand-red">
                      {sale.profiles?.nome || 'Revendedor'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {sale.contacts?.nome || 'Cliente'}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                      {sale.contacts?.telefone || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                        {sale.origem || sale.contacts?.origem || 'WhatsApp'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-emerald-400">
                      {sale.valor > 0 ? `R$ ${Number(sale.valor).toFixed(2)}` : 'Concluída'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge type="sale" value={sale.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-500 font-medium">
                      {new Date(sale.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro Manual de Venda */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121212] p-6 shadow-2xl">
            <button
              onClick={() => setIsRegisterModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-500" /> Registrar Venda Concluída
            </h3>
            <p className="text-xs text-zinc-400 mb-5">
              Audite e registre manualmente uma venda convertida.
            </p>

            <form onSubmit={handleRegisterSale} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Revendedor Responsável:</label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                >
                  <option value="">Selecione o revendedor...</option>
                  {resellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome} ({r.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Cliente / Lead:</label>
                <select
                  required
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                >
                  <option value="">Selecione o lead da base...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} - {c.telefone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Valor da Venda (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="35.00"
                    value={saleValue}
                    onChange={(e) => setSaleValue(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Origem:</label>
                  <select
                    value={saleOrigin}
                    onChange={(e) => setSaleOrigin(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Indicação">Indicação</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Observações (Opcional):</label>
                <textarea
                  rows={2}
                  value={saleObs}
                  onChange={(e) => setSaleObs(e.target.value)}
                  placeholder="Ex: Plano trimestral com tela extra"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white focus:border-brand-red focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
                    </>
                  ) : (
                    'Salvar Registro de Venda'
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
