import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Contact, Creative } from '../types';
import { useToast } from '../contexts/ToastContext';
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
  Filter,
  Flame,
  Star,
} from 'lucide-react';

export const ResellerDashboard: React.FC = () => {
  const { profile, session } = useAuth();
  const { success, error: toastError } = useToast();
  const [contacts, setContacts] = useState<(Contact & { status?: string })[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'leads' | 'creatives'>('leads');
  const [statusFilter, setStatusFilter] = useState<'novo' | 'em_contato' | 'pendente' | 'concluido'>('novo');

  const [messageType, setMessageType] = useState('venda_direta');
  const [provider, setProvider] = useState<string>('groq');
  const [customInstructions, setCustomInstructions] = useState('');
  const [resellerPhone, setResellerPhone] = useState(
    profile?.whatsapp || localStorage.getItem('msplay_reseller_phone') || ''
  );
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchLeadsAndCreatives = async () => {
    if (!profile) return;

    try {
      // 1. Buscar contatos atribuídos
      const { data: assignments } = await supabase
        .from('contact_assignments')
        .select('contact_id, status, contacts (*)')
        .eq('user_id', profile.id);

      if (assignments) {
        const formatted = assignments
          .map((item: any) => ({
            ...item.contacts,
            status: item.status || 'novo',
          }))
          .filter(Boolean);
        setContacts(formatted);
      }

      // 2. Buscar criativos
      const { data: creativesData } = await supabase
        .from('creatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (creativesData) setCreatives(creativesData);
    } catch (err: any) {
      console.error('Erro ao buscar leads do revendedor:', err);
    }
  };

  useEffect(() => {
    fetchLeadsAndCreatives();
  }, [profile]);

  const handleSavePhone = async (phone: string) => {
    setResellerPhone(phone);
    localStorage.setItem('msplay_reseller_phone', phone);
    if (profile) {
      await supabase.from('profiles').update({ whatsapp: phone }).eq('id', profile.id);
      success('Número de WhatsApp atualizado!');
    }
  };

  const handleGenerateMessage = async () => {
    if (!selectedContact) {
      setErrorMsg('Selecione um contato na lista primeiro.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setGeneratedMessage('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          contactName: selectedContact.nome,
          contactPhone: selectedContact.telefone,
          contactNotes: selectedContact.observacoes,
          messageType,
          provider,
          customInstructions,
          resellerPhone,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na API');
      setGeneratedMessage(data.text);

      // Atualizar última atividade
      if (profile) {
        await supabase
          .from('profiles')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', profile.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedMessage) return;
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    success('Mensagem copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = async () => {
    if (!selectedContact || !generatedMessage) return;
    const phone = selectedContact.telefone.replace(/\D/g, '');

    // Atualiza status para 'pendente' automaticamente ao enviar
    await updateLeadStatus(selectedContact.id, 'pendente');

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(generatedMessage)}`, '_blank');
  };

  const updateLeadStatus = async (
    contactId: string,
    newStatus: 'novo' | 'em_contato' | 'pendente' | 'concluido'
  ) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('contact_assignments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.id)
        .eq('contact_id', contactId);

      if (error) throw error;

      // Se concluiu venda, registrar na tabela sales
      if (newStatus === 'concluido') {
        await supabase.from('sales').insert({
          contact_id: contactId,
          user_id: profile.id,
          valor: 0.0,
          status: 'concluido',
          origem: 'WhatsApp',
          observacoes: 'Venda finalizada pelo revendedor',
        });
        success('?? Parabéns! Venda registrada com sucesso!');
      } else {
        success(`Lead atualizado para ${newStatus.toUpperCase()}`);
      }

      // Atualizar última atividade do revendedor
      await supabase
        .from('profiles')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', profile.id);

      fetchLeadsAndCreatives();
    } catch (err: any) {
      toastError('Erro ao atualizar status: ' + err.message);
    }
  };

  const generateCustomImage = (imageUrl: string, title: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      canvas.width = img.width || 1080;
      canvas.height = img.height || 1080;
      ctx.drawImage(img, 0, 0);

      if (resellerPhone) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, canvas.height - 140, canvas.width, 140);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('GARANTA JÁ O SEU TESTE!', 50, canvas.height - 85);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText(`?? WhatsApp: ${resellerPhone}`, 50, canvas.height - 35);
      }

      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_${resellerPhone || 'zap'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      success('Imagem gerada e baixada com sucesso!');
    };
  };

  const filteredContacts = contacts.filter(
    (c) => c.status === statusFilter && c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Barra de Configuração do WhatsApp do Revendedor */}
      <div className="bg-[#121212] border border-zinc-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Seu WhatsApp de Atendimento
            </p>
            <p className="text-sm font-black text-white">{resellerPhone || 'Não configurado'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Ex: (32) 99999-9999"
            value={resellerPhone}
            onChange={(e) => setResellerPhone(e.target.value)}
            className="p-2.5 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-white outline-none focus:border-brand-red w-full sm:w-60"
          />
          <button
            onClick={() => handleSavePhone(resellerPhone)}
            className="bg-brand-red hover:bg-brand-redHover text-white px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 shadow-lg shadow-brand-red/20 transition"
          >
            Salvar
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'leads'
              ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          Funil de Leads & IA
        </button>
        <button
          onClick={() => setActiveTab('creatives')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'creatives'
              ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          Criativos & Posts Prontos
        </button>
      </div>

      {activeTab === 'leads' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista de Leads */}
          <div className="lg:col-span-5 border border-zinc-800 bg-[#121212] rounded-2xl p-5 shadow-sm h-[calc(100vh-260px)] flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Meus Leads</h2>
              <div className="flex bg-zinc-900 p-1 rounded-xl text-[10px] font-bold border border-zinc-800">
                <button
                  onClick={() => setStatusFilter('novo')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    statusFilter === 'novo' ? 'bg-brand-red text-white' : 'text-zinc-400'
                  }`}
                >
                  Novos
                </button>
                <button
                  onClick={() => setStatusFilter('em_contato')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    statusFilter === 'em_contato' ? 'bg-brand-red text-white' : 'text-zinc-400'
                  }`}
                >
                  Em Contato
                </button>
                <button
                  onClick={() => setStatusFilter('pendente')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    statusFilter === 'pendente' ? 'bg-brand-red text-white' : 'text-zinc-400'
                  }`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setStatusFilter('concluido')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    statusFilter === 'concluido' ? 'bg-brand-red text-white' : 'text-zinc-400'
                  }`}
                >
                  Vendas
                </button>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar lead por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder-zinc-500 outline-none focus:border-brand-red"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredContacts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                    selectedContact?.id === c.id
                      ? 'border-brand-red bg-brand-red/10'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between font-bold mb-1">
                    <span className="flex gap-1.5 items-center text-white">
                      <User className="w-3.5 h-3.5 text-brand-red" />
                      {c.nome}
                    </span>
                    <span className="text-zinc-400 font-mono text-[11px]">{c.telefone}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/80 text-[10px]">
                    <span className="text-zinc-400 capitalize">
                      Status: <b className="text-white">{c.status}</b>
                    </span>
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {c.status !== 'em_contato' && (
                        <button
                          onClick={() => updateLeadStatus(c.id, 'em_contato')}
                          className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30"
                        >
                          Em Contato
                        </button>
                      )}
                      {c.status !== 'pendente' && (
                        <button
                          onClick={() => updateLeadStatus(c.id, 'pendente')}
                          className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30"
                        >
                          Pendente
                        </button>
                      )}
                      {c.status !== 'concluido' && (
                        <button
                          onClick={() => updateLeadStatus(c.id, 'concluido')}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30"
                        >
                          Vendeu!
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredContacts.length === 0 && (
                <p className="text-center text-xs text-zinc-500 py-12">Nenhum lead nesta categoria.</p>
              )}
            </div>
          </div>

          {/* Gerador de IA */}
          <div className="lg:col-span-7 border border-zinc-800 bg-[#121212] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
                <h2 className="text-sm font-bold flex gap-2 items-center text-white uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-brand-red" /> Gerador de Abordagem IA
                </h2>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="text-xs p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white font-bold"
                >
                  <option value="groq">Groq Llama 3 (Rápido)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="nvidia">NVIDIA Llama 70B</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="custom">IA Personalizada</option>
                </select>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="space-y-3 mb-4">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Escolha o Objetivo da Abordagem:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'venda_direta', label: '? Venda Direta' },
                    { id: 'venda_persuasiva', label: '?? Venda Persuasiva' },
                    { id: 'venda_rapida', label: '?? Venda Rápida' },
                    { id: 'recuperacao', label: '?? Recuperação de Inativo' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setMessageType(t.id)}
                      className={`py-2 px-3 rounded-xl font-bold border transition text-left ${
                        messageType === t.id
                          ? 'border-brand-red bg-brand-red text-white shadow-md shadow-brand-red/20'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Instruções extras (opcional)"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder-zinc-500 outline-none focus:border-brand-red"
                />

                <button
                  onClick={handleGenerateMessage}
                  disabled={loading || !selectedContact}
                  className="w-full bg-brand-red hover:bg-brand-redHover text-white py-2.5 rounded-xl font-bold text-xs flex justify-center gap-2 shadow-lg shadow-brand-red/20 transition disabled:opacity-40"
                >
                  {loading ? (
                    'Gerando mensagem persuasiva...'
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Gerar Mensagem Pronta com IA
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={6}
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
                placeholder="A mensagem gerada pela IA aparecerá aqui..."
                className="w-full p-3 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-white leading-relaxed outline-none focus:border-brand-red font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-800">
              <button
                onClick={handleCopy}
                disabled={!generatedMessage}
                className="flex justify-center items-center gap-2 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-200 text-xs font-bold hover:bg-zinc-800 transition disabled:opacity-40"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                Copiar Texto
              </button>
              <button
                onClick={handleOpenWhatsApp}
                disabled={!generatedMessage || !selectedContact}
                className="flex justify-center items-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition disabled:opacity-40"
              >
                <Send className="w-4 h-4" /> Abrir no WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Criativos */
        <div className="border border-zinc-800 bg-[#121212] p-6 rounded-2xl shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-brand-red" /> Galeria de Criativos & Mídia de Divulgação
            </h2>
            <p className="text-xs text-zinc-400">
              Ao clicar em baixar, o sistema insere automaticamente o seu número de WhatsApp cadastrado no rodapé do banner.
            </p>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {creatives.map((cr) => (
              <div
                key={cr.id}
                className="border border-zinc-800 rounded-2xl p-4 bg-zinc-900/40 flex flex-col justify-between hover:border-zinc-700 transition"
              >
                <div>
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-zinc-950">
                    <img src={cr.imagem_url} alt={cr.titulo} className="w-full h-full object-cover" />
                    {cr.recomendado && (
                      <span className="absolute top-2 left-2 rounded-md bg-amber-500 text-black px-2 py-0.5 text-[9px] font-black flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-black" /> RECOMENDADO
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-white">{cr.titulo}</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {cr.descricao || 'Criativo oficial MSPLAY otimizado para conversão.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!resellerPhone) {
                      toastError('Por favor, informe seu número de WhatsApp no topo da tela antes de baixar a imagem.');
                      return;
                    }
                    generateCustomImage(cr.imagem_url, cr.titulo);
                  }}
                  className="mt-4 w-full bg-brand-red hover:bg-brand-redHover text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-red/20 transition"
                >
                  <ImageIcon className="w-4 h-4" /> Baixar com Meu WhatsApp
                </button>
              </div>
            ))}
            {creatives.length === 0 && (
              <p className="text-zinc-500 text-xs py-12 col-span-full text-center">
                Nenhum criativo cadastrado pelo Admin ainda.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
