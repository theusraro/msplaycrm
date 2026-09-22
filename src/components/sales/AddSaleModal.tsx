import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { normalizeBrazilianPhone } from '../../utils/phoneNormalizer';
import { logAuditEvent } from '../../services/auditService';
import { Profile, Contact } from '../../types';
import {
  X,
  Plus,
  DollarSign,
  User,
  Phone,
  Tv,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  CreditCard
} from 'lucide-react';

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSale?: any) => void;
  resellers?: Profile[];
  currentUserId: string;
  isAdmin?: boolean;
  existingContacts?: Contact[];
}

export const AddSaleModal: React.FC<AddSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  resellers = [],
  currentUserId,
  isAdmin = false,
  existingContacts = []
}) => {
  const { addToast } = useToast();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [selectedTelas, setSelectedTelas] = useState<number>(1);
  const [isCustomTelas, setIsCustomTelas] = useState(false);
  const [customTelasQty, setCustomTelasQty] = useState('');
  const [valor, setValor] = useState('30,00');
  const [metodoPagamento, setMetodoPagamento] = useState('pix');
  const [targetResellerId, setTargetResellerId] = useState(currentUserId || '');
  const [observacoes, setObservacoes] = useState('');
  const [matchedExistingContact, setMatchedExistingContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNome('');
      setTelefone('');
      setSelectedTelas(1);
      setIsCustomTelas(false);
      setCustomTelasQty('');
      setValor('30,00');
      setMetodoPagamento('pix');
      setObservacoes('');
      setMatchedExistingContact(null);
      if (isAdmin && resellers.length > 0) {
        setTargetResellerId(currentUserId || resellers[0].id);
      } else {
        setTargetResellerId(currentUserId);
      }
    }
  }, [isOpen, isAdmin, currentUserId, resellers]);

  // Detector em tempo real de contato existente ao digitar telefone
  useEffect(() => {
    if (!telefone.trim()) {
      setMatchedExistingContact(null);
      return;
    }

    const norm = normalizeBrazilianPhone(telefone.trim());
    if (norm.isValid && norm.cleanDigits) {
      const found = existingContacts.find((c) => {
        const cNorm = normalizeBrazilianPhone(c.telefone);
        return cNorm.cleanDigits === norm.cleanDigits || c.telefone.replace(/\D/g, '') === norm.cleanDigits;
      });

      if (found) {
        setMatchedExistingContact(found);
        if (!nome.trim()) {
          setNome(found.nome);
        }
      } else {
        setMatchedExistingContact(null);
      }
    } else {
      setMatchedExistingContact(null);
    }
  }, [telefone, existingContacts]);

  if (!isOpen) return null;

  const handleSelectPredefinedTelas = (qty: number) => {
    setIsCustomTelas(false);
    setSelectedTelas(qty);
    if (qty === 1) setValor('30,00');
    else if (qty === 2) setValor('45,00');
    else if (qty === 3) setValor('60,00');
    else if (qty === 4) setValor('75,00');
    else if (qty === 5) setValor('90,00');
  };

  const handleCustomTelasClick = () => {
    setIsCustomTelas(true);
    if (!customTelasQty) {
      setCustomTelasQty('6');
    }
  };

  const computedScreenQty = isCustomTelas ? (parseInt(customTelasQty, 10) || 1) : selectedTelas;
  const planoDisplay = computedScreenQty === 1 ? '1 tela' : `${computedScreenQty} telas`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const trimmedNome = nome.trim();
    if (!trimmedNome) {
      addToast('O nome do cliente é obrigatório.', 'warning');
      return;
    }

    const trimmedPhone = telefone.trim();
    if (!trimmedPhone) {
      addToast('O telefone/WhatsApp do cliente é obrigatório.', 'warning');
      return;
    }

    const phoneNorm = normalizeBrazilianPhone(trimmedPhone);
    if (!phoneNorm.isValid) {
      addToast(phoneNorm.error || 'Telefone inválido. Informe DDD e número válidos.', 'warning');
      return;
    }

    if (computedScreenQty < 1 || isNaN(computedScreenQty)) {
      addToast('A quantidade de telas deve ser no mínimo 1.', 'warning');
      return;
    }

    const cleanValor = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
    if (cleanValor <= 0) {
      addToast('Informe um valor válido maior que zero para a venda.', 'warning');
      return;
    }

    const finalUserId = isAdmin ? (targetResellerId || currentUserId) : currentUserId;
    if (!finalUserId) {
      addToast('Selecione o revendedor responsável pela venda.', 'warning');
      return;
    }

    setSaving(true);
    try {
      // 1. Verificar se o contato já existe no banco (busca inteligente por telefone normalizado)
      const cleanDigits = phoneNorm.cleanDigits;
      let existingContact: Contact | undefined;

      const { data: dbMatches, error: searchError } = await supabase
        .from('contacts')
        .select('*')
        .or(`telefone.ilike.%${cleanDigits}%,telefone.eq.${phoneNorm.formatted},telefone.eq.${phoneNorm.cleanDigits}`);

      if (!searchError && dbMatches && dbMatches.length > 0) {
        existingContact = dbMatches.find((c) => {
          const norm = normalizeBrazilianPhone(c.telefone);
          return norm.cleanDigits === cleanDigits || c.telefone.replace(/\D/g, '') === cleanDigits;
        });
      }

      // Fallback para contatos em memória se necessário
      if (!existingContact && existingContacts.length > 0) {
        existingContact = existingContacts.find((c) => {
          const norm = normalizeBrazilianPhone(c.telefone);
          return norm.cleanDigits === cleanDigits || c.telefone.replace(/\D/g, '') === cleanDigits;
        });
      }

      let contactId = existingContact?.id;
      let createdNewContact = false;

      // 2. Se o contato NÃO existir, criar em public.contacts utilizando SOMENTE colunas reais
      if (!existingContact) {
        const contactPayload: any = {
          nome: trimmedNome,
          telefone: phoneNorm.formatted,
          observacoes: observacoes.trim() || `Cadastrado via Nova Venda (${planoDisplay})`,
          tags: ['venda_direta'],
          created_by: currentUserId
        };

        const { data: newContact, error: createContactError } = await supabase
          .from('contacts')
          .insert([contactPayload])
          .select()
          .single();

        if (createContactError) {
          throw new Error(`Não foi possível cadastrar o contato: ${createContactError.message}`);
        }

        contactId = newContact.id;
        createdNewContact = true;
      } else {
        addToast('Este contato já existe no CRM. A venda será vinculada ao cadastro existente.', 'info');
      }

      // 3. Registrar a venda em public.sales utilizando SOMENTE colunas reais
      const salePayload: any = {
        user_id: finalUserId,
        contact_id: contactId,
        valor: cleanValor,
        plano: planoDisplay,
        metodo_pagamento: metodoPagamento,
        observacoes: observacoes.trim() || null
      };

      const { data: newSale, error: createSaleError } = await supabase
        .from('sales')
        .insert([salePayload])
        .select()
        .single();

      if (createSaleError) {
        throw new Error(`Não foi possível registrar a venda: ${createSaleError.message}`);
      }

      // 4. Se já existir uma assignment correspondente a contact_id + user_id, atualizar para 'concluido'
      if (contactId && finalUserId) {
        try {
          const { data: assignmentData } = await supabase
            .from('contact_assignments')
            .select('id')
            .eq('contact_id', contactId)
            .eq('user_id', finalUserId)
            .maybeSingle();

          if (assignmentData?.id) {
            await supabase
              .from('contact_assignments')
              .update({ status: 'concluido' })
              .eq('id', assignmentData.id);
          }
        } catch (assignErr) {
          console.warn('Aviso ao atualizar status de assignment:', assignErr);
        }
      }

      // 5. Auditoria da ação
      try {
        await logAuditEvent('create_sale', {
          sale_id: newSale.id,
          user_id: finalUserId,
          contact_id: contactId,
          valor: cleanValor,
          plano: planoDisplay,
          created_new_contact: createdNewContact
        });
      } catch (auditErr) {
        console.warn('Aviso ao registrar auditoria:', auditErr);
      }

      addToast('Venda registrada com sucesso.', 'success');
      onClose();
      onSuccess(newSale);
    } catch (err: any) {
      console.error('Erro ao registrar venda:', err);
      addToast(err.message || 'Não foi possível registrar a venda.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in duration-200 my-auto">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between pb-3.5 border-b border-brand-lightBorder dark:border-brand-darkBorder">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" /> Adicionar venda
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Registre a venda diretamente. Se o cliente não existir, ele será cadastrado automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          {/* Se Admin: seleção do Revendedor Responsável */}
          {isAdmin && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Revendedor Responsável *
              </label>
              <select
                required
                value={targetResellerId}
                onChange={(e) => setTargetResellerId(e.target.value)}
                disabled={saving}
                className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-red font-bold text-xs"
              >
                <option value="">Selecione o revendedor...</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome_completo || r.nome || r.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nome do Cliente */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Nome do Cliente *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Ex: João da Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={saving}
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>

          {/* Telefone / WhatsApp */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Telefone / WhatsApp *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                placeholder="(32) 99999-9999 ou 32999999999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                disabled={saving}
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-red font-mono"
              />
            </div>

            {matchedExistingContact ? (
              <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-[11px] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                <span>
                  Contato existente encontrado: <strong>{matchedExistingContact.nome}</strong> ({matchedExistingContact.telefone}). A venda será vinculada.
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                O sistema normaliza e verifica se o contato já existe antes de cadastrar.
              </p>
            )}
          </div>

          {/* Plano / Quantidade de Telas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-brand-red" /> Quantidade de Telas *
              </label>
              <span className="font-black text-brand-red text-xs bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                {planoDisplay}
              </span>
            </div>

            {/* Botoes de selecao rapida de telas */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5].map((qty) => {
                const isActive = !isCustomTelas && selectedTelas === qty;
                return (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => handleSelectPredefinedTelas(qty)}
                    disabled={saving}
                    className={`py-2 px-1 rounded-xl font-bold text-xs transition border min-h-[38px] ${
                      isActive
                        ? 'bg-brand-red text-white border-brand-red shadow-xs'
                        : 'bg-slate-50 dark:bg-brand-dark border-brand-lightBorder dark:border-brand-darkBorder text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                    }`}
                  >
                    {qty} {qty === 1 ? 'tela' : 'telas'}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleCustomTelasClick}
                disabled={saving}
                className={`py-2 px-1 rounded-xl font-bold text-xs transition border min-h-[38px] ${
                  isCustomTelas
                    ? 'bg-brand-red text-white border-brand-red shadow-xs'
                    : 'bg-slate-50 dark:bg-brand-dark border-brand-lightBorder dark:border-brand-darkBorder text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                }`}
              >
                + Outra
              </button>
            </div>

            {/* Input customizado de telas caso selecionado */}
            {isCustomTelas && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-brand-lightBorder dark:border-brand-darkBorder flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                  Informe a quantidade:
                </span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required={isCustomTelas}
                  value={customTelasQty}
                  onChange={(e) => setCustomTelasQty(e.target.value)}
                  disabled={saving}
                  placeholder="Ex: 6"
                  className="w-20 p-1.5 text-xs font-bold rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-red text-center"
                />
                <span className="text-xs font-bold text-slate-500">telas</span>
              </div>
            )}
          </div>

          {/* Linha com Valor e Metodo de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Valor da Venda (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="30,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  disabled={saving}
                  className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-slate-900 dark:text-white font-black outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Método de Pagamento
              </label>
              <select
                value={metodoPagamento}
                onChange={(e) => setMetodoPagamento(e.target.value)}
                disabled={saving}
                className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-red font-bold text-xs"
              >
                <option value="pix">PIX</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="boleto">Boleto</option>
              </select>
            </div>
          </div>

          {/* Observações Opcionais */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Veio por indicação do Carlos / Teste aprovado"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              disabled={saving}
              className="w-full p-2.5 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>

          {/* Botões do Rodapé */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3.5 border-t border-brand-lightBorder dark:border-brand-darkBorder">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder text-slate-700 dark:text-zinc-300 font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] disabled:opacity-50 min-h-[44px]"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  <span>Registrar venda</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
