import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Contact, Creative } from '../types';
import {
  Sparkles,
  Copy,
  Send,
  Check,
  Search,
  User,
  AlertCircle,
  Image as ImageIcon,
  Phone,
  CheckCircle2,
  Clock,
  Inbox,
  Download,
  RefreshCw,
  Tag,
  DollarSign,
  X,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export interface ResellerLead extends Contact {
  assignment_id: string;
  status: 'novo' | 'pendente' | 'concluido';
}

export const ResellerDashboard: React.FC = () => {
  const { profile, session } = useAuth();
  const { addToast } = useToast();
  const [contacts, setContacts] = useState<ResellerLead[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [selectedContact, setSelectedContact] = useState<ResellerLead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'leads' | 'creatives'>('leads');
  const [statusFilter, setStatusFilter] = useState<'novo' | 'pendente' | 'concluido'>('novo');

  const [messageType, setMessageType] = useState('venda_direta');
  const [customInstructions, setCustomInstructions] = useState('');
  const [resellerPhone, setResellerPhone] = useState(localStorage.getItem('msplay_reseller_phone') || '');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAiOverloaded, setIsAiOverloaded] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Modal Registrar Venda
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleTargetLead, setSaleTargetLead] = useState<ResellerLead | null>(null);
  const [saleValor, setSaleValor] = useState('35,00');
  const [salePlano, setSalePlano] = useState('Mensal');
  const [saleMetodo, setSaleMetodo] = useState('pix');
  const [saleNotes, setSaleNotes] = useState('');
  const [savingSale, setSavingSale] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchLeadsAndCreatives = async () => {
    if (!profile) return;
    
    // Buscar contatos e status atribuídos ao revendedor selecionando assignment.id
    const { data: assignments, error: assignError } = await supabase
      .from('contact_assignments')
      .select('id, contact_id, status, assigned_at, contacts (*)')
      .eq('user_id', profile.id)
      .order('assigned_at', { ascending: false });

    if (assignments) {
      const formatted: ResellerLead[] = assignments
        .filter((item: any) => item.contacts && item.contacts.id)
        .map((item: any) => ({
          ...item.contacts,
          assignment_id: item.id,
          status: (item.status as 'novo' | 'pendente' | 'concluido') || 'novo'
        }));
      setContacts(formatted);
    }

    // Buscar imagens de divulgação cadastradas pelo Admin
    const { data: creativesData } = await supabase
      .from('creatives')
      .select('*')
      .order('created_at', { ascending: false });
    if (creativesData) setCreatives(creativesData);
  };

  useEffect(() => {
    fetchLeadsAndCreatives();
    if (profile && !resellerPhone) {
      const phoneFromProfile = profile.whatsapp || profile.telefone || '';
      if (phoneFromProfile) {
        setResellerPhone(phoneFromProfile);
      }
    }
  }, [profile]);

  const handleSavePhone = (phone: string) => {
    setResellerPhone(phone);
    localStorage.setItem('msplay_reseller_phone', phone);
  };

  const handleGenerateMessage = async () => {
    if (!selectedContact) return setErrorMsg('Selecione um contato na lista primeiro.');
    setLoading(true);
    setIsAiOverloaded(false);
    setErrorMsg('');
    setGeneratedMessage('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          contactName: selectedContact.nome,
          contactPhone: selectedContact.telefone,
          contactNotes: selectedContact.observacoes,
          messageType,
          customInstructions,
          resellerPhone
        })
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        console.error('Resposta do backend não é JSON válido:', rawText);
        throw new Error(`Resposta inválida do servidor (${response.status}): ${rawText.slice(0, 120) || 'Corpo vazio'}`);
      }

      if (!response.ok) {
        if (response.status === 503 || data.isTemporary || (data.error && data.error.includes('sobrecarregado'))) {
          setIsAiOverloaded(true);
          throw new Error('Modelo temporariamente sobrecarregado. Aguarde alguns segundos e tente novamente.');
        }
        throw new Error(data.error || `Erro no servidor (${response.status})`);
      }
      setGeneratedMessage(data.text);
    } catch (err: any) {
      const isTemp = err.message?.includes('sobrecarregado') || err.message?.includes('temporariamente');
      if (isTemp) {
        setIsAiOverloaded(true);
        setErrorMsg('Modelo temporariamente sobrecarregado. Aguarde alguns segundos e tente novamente.');
      } else {
        setErrorMsg(err.message || 'Falha ao gerar mensagem');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedMessage) return;
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateLeadStatus = async (
    assignmentId: string,
    newStatus: 'novo' | 'pendente' | 'concluido'
  ): Promise<boolean> => {
    if (!profile) return false;
    setStatusUpdatingId(assignmentId);

    // Atualização otimista
    const previousContacts = [...contacts];
    setContacts(prev =>
      prev.map(c => (c.assignment_id === assignmentId ? { ...c, status: newStatus } : c))
    );
    if (selectedContact && selectedContact.assignment_id === assignmentId) {
      setSelectedContact(prev => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const { error } = await supabase
        .from('contact_assignments')
        .update({ status: newStatus })
        .eq('id', assignmentId)
        .eq('user_id', profile.id);

      if (error) {
        setContacts(previousContacts);
        addToast('Erro ao atualizar status: ' + error.message, 'error');
        return false;
      }

      const labelMap = { novo: 'Novo', pendente: 'Pendente', concluido: 'Vendido' };
      addToast(`Status atualizado para "${labelMap[newStatus]}"!`, 'success');
      return true;
    } catch (err: any) {
      setContacts(previousContacts);
      addToast('Erro ao atualizar status: ' + err.message, 'error');
      return false;
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleOpenWhatsApp = async () => {
    if (!selectedContact || !generatedMessage) return;
    const phone = selectedContact.telefone.replace(/\D/g, '');

    // Regra: se o lead for "novo", muda para "pendente". Se já for "pendente" ou "concluido" (Vendido), não altera.
    if (selectedContact.status === 'novo' && selectedContact.assignment_id) {
      await updateLeadStatus(selectedContact.assignment_id, 'pendente');
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(generatedMessage)}`, '_blank');
  };

  const handleOpenSaleModal = (lead: ResellerLead) => {
    setSaleTargetLead(lead);
    setSaleValor('35,00');
    setSalePlano('Mensal');
    setSaleMetodo('pix');
    setSaleNotes('');
    setShowSaleModal(true);
  };

  const handleSaveSale = async () => {
    if (!saleTargetLead || !profile) return;

    const cleanValor = parseFloat(saleValor.replace(/\./g, '').replace(',', '.')) || 0;
    if (cleanValor <= 0) {
      addToast('Informe um valor válido para a venda.', 'warning');
      return;
    }

    setSavingSale(true);
    try {
      // 1. Inserir venda primeiro
      const salePayload = {
        user_id: profile.id,
        contact_id: saleTargetLead.id,
        assignment_id: saleTargetLead.assignment_id,
        valor: cleanValor,
        plano: salePlano,
        metodo_pagamento: saleMetodo,
        status: 'concluido',
        origem: 'crm',
        observacoes: saleNotes.trim() || null
      };

      const { error: saleError } = await supabase.from('sales').insert([salePayload]);
      if (saleError) {
        throw new Error(`Falha ao registrar venda: ${saleError.message}`);
      }

      // 2. Somente após inserir a venda com sucesso, atualizar status do lead para 'concluido' (Vendido)
      await updateLeadStatus(saleTargetLead.assignment_id, 'concluido');

      setShowSaleModal(false);
      setSaleTargetLead(null);
      addToast('Venda registrada com sucesso!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Erro ao registrar venda', 'error');
    } finally {
      setSavingSale(false);
    }
  };

  const generateCustomImage = async (cr: { id: string; imagem_url: string; titulo: string }) => {
    const activePhone = (
      resellerPhone ||
      profile?.whatsapp ||
      profile?.telefone ||
      localStorage.getItem('msplay_reseller_phone') ||
      ''
    ).trim();

    if (!activePhone) {
      addToast('Por favor, informe seu número de WhatsApp no topo da tela antes de baixar a imagem.', 'warning');
      return;
    }

    setGeneratingId(cr.id);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      // Cache buster para evitar conflitos de cache no navegador com CORS
      const srcUrl = cr.imagem_url.startsWith('data:') || cr.imagem_url.startsWith('blob:')
        ? cr.imagem_url
        : `${cr.imagem_url}${cr.imagem_url.includes('?') ? '&' : '?'}t=${Date.now()}`;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Não foi possível carregar a imagem original.'));
        img.src = srcUrl;
      });

      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível inicializar o canvas de desenho.');

      const width = img.naturalWidth || img.width || 1080;
      const height = img.naturalHeight || img.height || 1080;

      canvas.width = width;
      canvas.height = height;

      // 1. Desenha a imagem original mantendo resolução nativa
      ctx.drawImage(img, 0, 0, width, height);

      // 2. Calcula a área do rodapé proporcional às dimensões reais da imagem
      const footerRatio = height >= width ? 0.12 : 0.14;
      const footerHeight = Math.max(130, Math.round(height * footerRatio));
      const footerY = height - footerHeight;

      // 3. Limpa e cobre COMPLETAMENTE o rodapé antigo com fundo 100% opaco da identidade MSPLAY (#050505)
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, footerY, width, footerHeight);

      // 4. Linha de destaque/borda superior vermelha da identidade MSPLAY (#ef4444)
      const accentHeight = Math.max(4, Math.round(footerHeight * 0.035));
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, footerY, width, accentHeight);

      // 5. Configuração e desenho da CTA ("GARANTA JÁ O SEU TESTE!")
      const ctaText = 'GARANTA JÁ O SEU TESTE!';
      let ctaFontSize = Math.max(16, Math.round(footerHeight * 0.25));
      ctx.font = `bold ${ctaFontSize}px sans-serif`;
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Ajuste dinâmico de escala da CTA se a largura for estreita
      while (ctx.measureText(ctaText).width > width - 40 && ctaFontSize > 12) {
        ctaFontSize -= 2;
        ctx.font = `bold ${ctaFontSize}px sans-serif`;
      }
      const ctaY = footerY + (footerHeight * 0.38);
      ctx.fillText(ctaText, width / 2, ctaY);

      // 6. Configuração e desenho do WhatsApp do Revendedor
      const phoneText = `📞 WhatsApp: ${activePhone}`;
      let phoneFontSize = Math.max(20, Math.round(footerHeight * 0.33));
      ctx.font = `bold ${phoneFontSize}px sans-serif`;
      ctx.fillStyle = '#ffffff';

      // Ajuste dinâmico de escala do telefone para nunca vazar das margens
      while (ctx.measureText(phoneText).width > width - 40 && phoneFontSize > 14) {
        phoneFontSize -= 2;
        ctx.font = `bold ${phoneFontSize}px sans-serif`;
      }
      const phoneY = footerY + (footerHeight * 0.75);
      ctx.fillText(phoneText, width / 2, phoneY);

      // 7. Exporta imagem limpa em PNG utilizando toBlob para melhor performance e compatibilidade
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Falha ao processar o arquivo da imagem.'));
            return;
          }

          const blobUrl = URL.createObjectURL(blob);
          const cleanPhone = activePhone.replace(/\D/g, '');
          const cleanTitle = (cr.titulo || 'criativo').replace(/[^a-zA-Z0-9_-]/g, '_');
          const link = document.createElement('a');
          link.download = `${cleanTitle}_${cleanPhone || 'zap'}.png`;
          link.href = blobUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
          resolve();
        }, 'image/png');
      });

      addToast('Criativo baixado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro na personalização do criativo:', err);
      if (err.name === 'SecurityError' || (err.message && err.message.includes('Tainted'))) {
        addToast(
          'Esta imagem externa bloqueia edição de terceiros por políticas de CORS. Solicite ao Admin cadastrar a arte via Upload direto de arquivo.',
          'error'
        );
      } else {
        addToast(err.message || 'Erro ao gerar criativo personalizado.', 'error');
      }
    } finally {
      setGeneratingId(null);
    }
  };

  const filteredContacts = contacts.filter(c => c.status === statusFilter && c.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header de Boas-vindas MSPLAY CRM */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Olá, {profile?.nome_completo || profile?.nome || 'Revendedor'}!
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Bem-vindo ao seu painel <span className="font-bold text-brand-red">MSPLAY CRM</span>. Gerencie seus leads e personalize seus criativos.
          </p>
        </div>
      </div>

      {/* Barra de Configuração do WhatsApp do Revendedor */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-500"><Phone className="w-5 h-5" /></div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Seu WhatsApp de Atendimento</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{resellerPhone || 'Não configurado'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Ex: (32) 99999-9999" 
            value={resellerPhone} 
            onChange={(e) => handleSavePhone(e.target.value)} 
            className="p-2 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red w-full sm:w-60"
          />
          <button onClick={() => alert('Número salvo com sucesso!')} className="bg-brand-red text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0">Salvar</button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-brand-lightBorder dark:border-brand-darkBorder pb-3">
        <button onClick={() => setActiveTab('leads')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'leads' ? 'bg-brand-red text-white' : 'bg-slate-100 dark:bg-brand-darkCard text-slate-600 dark:text-zinc-400'}`}>Funil de Leads & IA</button>
        <button onClick={() => setActiveTab('creatives')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'creatives' ? 'bg-brand-red text-white' : 'bg-slate-100 dark:bg-brand-darkCard text-slate-600 dark:text-zinc-400'}`}>Criativos & Posts Prontos</button>
      </div>

      {activeTab === 'leads' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista de Leads */}
          <div className="lg:col-span-5 border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col min-h-[420px] lg:h-[calc(100vh-260px)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Meus Leads ({filteredContacts.length})
              </h2>
              <div className="flex bg-slate-100 dark:bg-brand-dark p-1 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setStatusFilter('novo')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition ${
                    statusFilter === 'novo' ? 'bg-brand-red text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Novos ({contacts.filter(c => c.status === 'novo').length})
                </button>
                <button
                  onClick={() => setStatusFilter('pendente')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition ${
                    statusFilter === 'pendente' ? 'bg-brand-red text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Pendentes ({contacts.filter(c => c.status === 'pendente').length})
                </button>
                <button
                  onClick={() => setStatusFilter('concluido')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition ${
                    statusFilter === 'concluido' ? 'bg-brand-red text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Vendidos ({contacts.filter(c => c.status === 'concluido').length})
                </button>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
              {filteredContacts.map((c) => {
                const isSelected = selectedContact?.id === c.id;
                const isUpdating = statusUpdatingId === c.assignment_id;

                return (
                  <div
                    key={c.assignment_id || c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'border-brand-red bg-red-50/70 dark:bg-red-950/30 shadow-xs'
                        : 'border-brand-lightBorder dark:border-brand-darkBorder hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-brand-dark/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-brand-red font-bold flex items-center justify-center shrink-0">
                          {c.nome ? c.nome.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate text-xs">{c.nome}</p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">{c.telefone}</p>
                        </div>
                      </div>

                      {/* Badge de status */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 border ${
                          c.status === 'novo'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : c.status === 'pendente'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}
                      >
                        {c.status === 'concluido' ? 'Vendido' : c.status === 'pendente' ? 'Pendente' : 'Novo'}
                      </span>
                    </div>

                    {c.observacoes && (
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mb-2 bg-white dark:bg-zinc-900/60 p-1.5 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder">
                        {c.observacoes}
                      </p>
                    )}

                    {/* Botões de Ação do Lead */}
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-brand-lightBorder dark:border-brand-darkBorder"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Mudar:</span>
                        {isUpdating ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                        ) : (
                          <>
                            {c.status !== 'novo' && (
                              <button
                                onClick={() => updateLeadStatus(c.assignment_id, 'novo')}
                                className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-100 transition min-h-[28px]"
                              >
                                Novo
                              </button>
                            )}
                            {c.status !== 'pendente' && (
                              <button
                                onClick={() => updateLeadStatus(c.assignment_id, 'pendente')}
                                className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-100 transition min-h-[28px]"
                              >
                                Pendente
                              </button>
                            )}
                            {c.status !== 'concluido' && (
                              <button
                                onClick={() => handleOpenSaleModal(c)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-100 transition flex items-center gap-1 min-h-[28px]"
                              >
                                <DollarSign className="w-3 h-3" /> Vendido
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://wa.me/${c.telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (c.status === 'novo' && c.assignment_id) {
                              updateLeadStatus(c.assignment_id, 'pendente');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition flex items-center gap-1 text-[10px] font-bold min-h-[28px]"
                          title="Abrir WhatsApp direto"
                        >
                          <Phone className="w-3 h-3" /> Zap
                        </a>
                        <button
                          onClick={() => setSelectedContact(c)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition min-h-[28px] ${
                            isSelected
                              ? 'bg-brand-red text-white'
                              : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          {isSelected ? 'Selecionado' : 'Usar na IA'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredContacts.length === 0 && (
                <div className="text-center py-12 text-slate-400 dark:text-zinc-500">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Nenhum lead encontrado nesta categoria.</p>
                </div>
              )}
            </div>
          </div>

          {/* Gerador de IA */}
          <div className="lg:col-span-7 border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-brand-lightBorder dark:border-brand-darkBorder pb-4 mb-4">
                <div>
                  <h2 className="text-base font-bold flex gap-2 items-center text-slate-900 dark:text-white">
                    <Sparkles className="w-5 h-5 text-brand-red" /> Gerador de Abordagem IA
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {selectedContact
                      ? `Gerando abordagem para: ${selectedContact.nome} (${selectedContact.telefone})`
                      : 'Selecione um lead na lista ao lado para personalizar a mensagem.'}
                  </p>
                </div>
              </div>

              {isAiOverloaded && (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Modelo temporariamente sobrecarregado. Aguarde alguns segundos e tente novamente.</span>
                  </div>
                  <button
                    onClick={handleGenerateMessage}
                    disabled={loading}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs shrink-0 self-start sm:self-auto transition min-h-[36px]"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {errorMsg && !isAiOverloaded && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3 mb-4">
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  Objetivo da Abordagem:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'venda_direta', label: '⚡ Venda Direta' },
                    { id: 'venda_persuasiva', label: '🎯 Venda Persuasiva' },
                    { id: 'venda_rapida', label: '🔥 Venda Rápida' },
                    { id: 'recuperacao', label: '🔄 Recuperação de Inativo' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setMessageType(t.id)}
                      className={`py-2.5 px-3 rounded-xl font-bold border transition text-left min-h-[44px] ${
                        messageType === t.id
                          ? 'border-brand-red bg-brand-red text-white shadow-xs'
                          : 'border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Instruções extras para a IA (ex: focar no Premiere ou Netflix)"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red text-slate-900 dark:text-white"
                />

                <button
                  onClick={handleGenerateMessage}
                  disabled={loading || !selectedContact}
                  className="w-full bg-brand-red hover:bg-brand-redHover text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition shadow-sm min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Gerando mensagem com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Gerar Mensagem Pronta
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={7}
                placeholder="A mensagem gerada aparecerá aqui. Você também pode editar o texto antes de enviar..."
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red leading-relaxed text-slate-900 dark:text-white font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-brand-lightBorder dark:border-brand-darkBorder">
              <button
                onClick={handleCopy}
                disabled={!generatedMessage}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-xs font-bold text-slate-700 dark:text-zinc-200 disabled:opacity-40 transition min-h-[44px]"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado para o Clipboard!' : 'Copiar Texto'}
              </button>

              <button
                onClick={handleOpenWhatsApp}
                disabled={!generatedMessage || !selectedContact}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-40 transition shadow-sm min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                Enviar WhatsApp & Mover p/ Pendente
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Criativos */
        <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl shadow-sm">
          <h2 className="text-base font-bold text-brand-red mb-2 flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Galeria de Criativos de Divulgação</h2>
          <p className="text-xs text-slate-500 mb-6">Ao clicar em baixar, o sistema substitui automaticamente o número da imagem pelo seu WhatsApp cadastrado.</p>
          
          <canvas ref={canvasRef} className="hidden" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {creatives.map(cr => (
              <div key={cr.id} className="border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-4 bg-slate-50 dark:bg-brand-dark flex flex-col justify-between group">
                <div>
                  <div className="relative mb-3">
                    <img
                      src={cr.imagem_url}
                      alt={cr.titulo}
                      className="w-full h-48 object-cover rounded-xl group-hover:scale-[1.02] transition duration-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/18181b/ffffff?text=Criativo';
                      }}
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                        <Tag className="w-3 h-3 text-brand-red" /> {cr.categoria || 'Geral'}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{cr.titulo}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cr.descricao || 'Criativo otimizado para conversão no WhatsApp.'}</p>
                </div>

                <button 
                  onClick={() => generateCustomImage(cr)}
                  disabled={generatingId !== null}
                  className="mt-4 w-full bg-brand-red hover:bg-brand-redHover text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition shadow-sm"
                >
                  {generatingId === cr.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Personalizando Imagem...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Baixar Imagem com Meu Zap
                    </>
                  )}
                </button>
              </div>
            ))}
            {creatives.length === 0 && <p className="text-slate-400 text-xs py-10 col-span-full text-center">Nenhum criativo cadastrado pelo Admin ainda.</p>}
          </div>
        </div>
      )}

      {/* Modal de Registro de Venda */}
      {showSaleModal && saleTargetLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-brand-lightBorder dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-5 border-b border-brand-lightBorder dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Registrar Venda
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Lead: <span className="font-bold text-slate-800 dark:text-zinc-200">{saleTargetLead.nome}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSaleModal(false);
                  setSaleTargetLead(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px]">
                A venda será gravada no histórico do financeiro e o lead será movido automaticamente para o status <b>Vendido</b>.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Valor da Venda (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input
                    type="text"
                    value={saleValor}
                    onChange={(e) => setSaleValor(e.target.value)}
                    placeholder="35,00"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Plano *
                  </label>
                  <select
                    value={salePlano}
                    onChange={(e) => setSalePlano(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white text-xs"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={saleMetodo}
                    onChange={(e) => setSaleMetodo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 dark:text-white text-xs"
                  >
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="boleto">Boleto</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  placeholder="Ex: Pagamento confirmado via comprovante, renova dia 10..."
                  className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-brand-lightBorder dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaleModal(false);
                  setSaleTargetLead(null);
                }}
                disabled={savingSale}
                className="px-4 py-2.5 rounded-xl border border-brand-lightBorder dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition min-h-[40px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSale}
                disabled={savingSale}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50 min-h-[40px]"
              >
                {savingSale ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando Venda...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar Venda
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};