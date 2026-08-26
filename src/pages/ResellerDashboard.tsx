import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Contact } from '../types';
import { Sparkles, Copy, Send, Check, Search, User, AlertCircle, Image as ImageIcon, Phone, CheckCircle2, Clock, Inbox } from 'lucide-react';

export const ResellerDashboard: React.FC = () => {
  const { profile, session } = useAuth();
  const [contacts, setContacts] = useState<(Contact & { status?: string })[]>([]);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'leads' | 'creatives'>('leads');
  const [statusFilter, setStatusFilter] = useState<'novo' | 'pendente' | 'concluido'>('novo');

  const [messageType, setMessageType] = useState('venda_direta');
  const [provider, setProvider] = useState<string>('groq');
  const [customInstructions, setCustomInstructions] = useState('');
  const [resellerPhone, setResellerPhone] = useState(localStorage.getItem('msplay_reseller_phone') || '');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchLeadsAndCreatives = async () => {
    if (!profile) return;
    
    // Buscar contatos e status atribuídos ao revendedor
    const { data: assignments } = await supabase
      .from('contact_assignments')
      .select('contact_id, status, contacts (*)')
      .eq('user_id', profile.id);

    if (assignments) {
      const formatted = assignments.map((item: any) => ({
        ...item.contacts,
        status: item.status || 'novo'
      })).filter(Boolean);
      setContacts(formatted);
    }

    // Buscar imagens de divulgação cadastradas pelo Admin
    const { data: creativesData } = await supabase.from('creatives').select('*').order('created_at', { ascending: false });
    if (creativesData) setCreatives(creativesData);
  };

  useEffect(() => {
    fetchLeadsAndCreatives();
  }, [profile]);

  const handleSavePhone = (phone: string) => {
    setResellerPhone(phone);
    localStorage.setItem('msplay_reseller_phone', phone);
  };

  const handleGenerateMessage = async () => {
    if (!selectedContact) return setErrorMsg('Selecione um contato na lista primeiro.');
    setLoading(true); setErrorMsg(''); setGeneratedMessage('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          contactName: selectedContact.nome,
          contactPhone: selectedContact.telefone,
          contactNotes: selectedContact.observacoes,
          messageType,
          provider,
          customInstructions,
          resellerPhone
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na API');
      setGeneratedMessage(data.text);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedMessage) return;
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // Ao clicar em enviar WhatsApp, move automaticamente de 'novo' para 'pendente'
  const handleOpenWhatsApp = async () => {
    if (!selectedContact || !generatedMessage) return;
    const phone = selectedContact.telefone.replace(/\D/g, '');
    
    // Atualiza status para 'pendente' no banco
    await supabase
      .from('contact_assignments')
      .update({ status: 'pendente' })
      .eq('user_id', profile?.id)
      .eq('contact_id', selectedContact.id);

    fetchLeadsAndCreatives();
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(generatedMessage)}`, '_blank');
  };

  const updateLeadStatus = async (contactId: string, newStatus: 'novo' | 'pendente' | 'concluido') => {
    await supabase
      .from('contact_assignments')
      .update({ status: newStatus })
      .eq('user_id', profile?.id)
      .eq('contact_id', contactId);

    fetchLeadsAndCreatives();
  };

  // Gerador dinâmico de imagem com o WhatsApp do revendedor embutido
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

      // Caixa de rodapé dinâmica com o WhatsApp do revendedor
      if (resellerPhone) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, canvas.height - 140, canvas.width, 140);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('GARANTA JÁ O SEU TESTE!', 50, canvas.height - 85);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText(`📞 WhatsApp: ${resellerPhone}`, 50, canvas.height - 35);
      }

      // Download automático da imagem personalizada
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_${resellerPhone || 'zap'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const filteredContacts = contacts.filter(c => c.status === statusFilter && c.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Barra de Configuração Rápida do WhatsApp do Revendedor */}
      <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-500"><Phone className="w-5 h-5" /></div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Seu WhatsApp de Atendimento</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{resellerPhone || 'Não configurado (Insira ao lado)'}</p>
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
          <button onClick={() => alert('Número salvo com sucesso! Ele será usado nas imagens e IA.')} className="bg-brand-red text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0">Salvar</button>
        </div>
      </div>

      {/* Abas Superiores */}
      <div className="flex gap-2 border-b border-brand-lightBorder dark:border-brand-darkBorder pb-3">
        <button onClick={() => setActiveTab('leads')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'leads' ? 'bg-brand-red text-white' : 'bg-slate-100 dark:bg-brand-darkCard text-slate-600 dark:text-zinc-400'}`}>Funil de Leads & IA</button>
        <button onClick={() => setActiveTab('creatives')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'creatives' ? 'bg-brand-red text-white' : 'bg-slate-100 dark:bg-brand-darkCard text-slate-600 dark:text-zinc-400'}`}>Criativos & Posts Prontos (Com seu Zap)</button>
      </div>

      {activeTab === 'leads' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Lista de Leads com Filtro de Status */}
          <div className="lg:col-span-5 border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard rounded-2xl p-5 shadow-sm h-[calc(100vh-260px)] flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider">Meus Leads</h2>
              <div className="flex bg-slate-100 dark:bg-brand-dark p-1 rounded-xl text-[10px] font-bold">
                <button onClick={() => setStatusFilter('novo')} className={`px-2.5 py-1 rounded-lg ${statusFilter === 'novo' ? 'bg-brand-red text-white' : 'text-slate-500'}`}>Novos</button>
                <button onClick={() => setStatusFilter('pendente')} className={`px-2.5 py-1 rounded-lg ${statusFilter === 'pendente' ? 'bg-brand-red text-white' : 'text-slate-500'}`}>Pendentes</button>
                <button onClick={() => setStatusFilter('concluido')} className={`px-2.5 py-1 rounded-lg ${statusFilter === 'concluido' ? 'bg-brand-red text-white' : 'text-slate-500'}`}>Vendas</button>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar lead..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredContacts.map(c => (
                <div key={c.id} onClick={() => setSelectedContact(c)} className={`p-3 rounded-xl border text-xs cursor-pointer transition ${selectedContact?.id === c.id ? 'border-brand-red bg-red-50 dark:bg-red-950/30' : 'border-brand-lightBorder dark:border-brand-darkBorder hover:border-slate-300'}`}>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="flex gap-1.5 items-center"><User className="w-3.5 h-3.5 text-brand-red" />{c.nome}</span>
                    <span className="text-slate-400">{c.telefone}</span>
                  </div>
                  {/* Ações rápidas de mover status */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-brand-lightBorder dark:border-brand-darkBorder text-[10px]">
                    <span className="text-slate-400 capitalize">Status: <b>{c.status}</b></span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {c.status !== 'pendente' && <button onClick={() => updateLeadStatus(c.id, 'pendente')} title="Marcar Pendente" className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Pendente</button>}
                      {c.status !== 'concluido' && <button onClick={() => updateLeadStatus(c.id, 'concluido')} title="Marcar Concluído (Venda)" className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">Vendeu!</button>}
                    </div>
                  </div>
                </div>
              ))}
              {filteredContacts.length === 0 && <p className="text-center text-xs text-slate-400 py-10">Nenhum lead nesta categoria.</p>}
            </div>
          </div>

          {/* Coluna Direita: IA Generator com os novos objetivos */}
          <div className="lg:col-span-7 border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between border-b border-brand-lightBorder dark:border-brand-darkBorder pb-4 mb-4">
              <h2 className="text-base font-bold flex gap-2 items-center"><Sparkles className="w-5 h-5 text-brand-red" /> Gerador de Abordagem IA</h2>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="text-xs p-1.5 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold">
                <option value="groq">Groq Llama 3</option>
                <option value="gemini">Google Gemini</option>
                <option value="claude">Anthropic Claude</option>
                <option value="nvidia">NVIDIA Llama 70B</option>
                <option value="openrouter">OpenRouter</option>
                <option value="custom">IA Personalizada</option>
              </select>
            </div>
            
            {errorMsg && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{errorMsg}</div>}

            <div className="space-y-3 mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase">Escolha o Objetivo da Abordagem:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'venda_direta', label: '⚡ Venda Direta' },
                  { id: 'venda_persuasiva', label: '🎯 Venda Persuasiva' },
                  { id: 'venda_rapida', label: '🔥 Venda Rápida' },
                  { id: 'recuperacao', label: '🔄 Recuperação de Inativo' }
                ].map(t => (
                  <button key={t.id} onClick={() => setMessageType(t.id)} className={`py-2 px-3 rounded-xl font-bold border transition text-left ${messageType === t.id ? 'border-brand-red bg-brand-red text-white' : 'border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-slate-700 dark:text-zinc-300'}`}>{t.label}</button>
                ))}
              </div>
              <input type="text" placeholder="Instruções extras (opcional, ex: Oferecer desconto de 10%)" value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} className="w-full p-2.5 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red" />
              <button onClick={handleGenerateMessage} disabled={loading || !selectedContact} className="w-full bg-brand-red hover:bg-brand-redHover text-white py-2.5 rounded-xl font-bold text-xs flex justify-center gap-2 disabled:opacity-50">
                {loading ? 'Gerando mensagem...' : <><Sparkles className="w-4 h-4" /> Gerar Mensagem Pronta</>}
              </button>
            </div>

            <textarea rows={6} value={generatedMessage} onChange={(e) => setGeneratedMessage(e.target.value)} className="w-full p-3 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red" />
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={handleCopy} disabled={!generatedMessage} className="flex justify-center gap-2 py-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-xs font-bold disabled:opacity-40">{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} Copiar Texto</button>
              <button onClick={handleOpenWhatsApp} disabled={!generatedMessage || !selectedContact} className="flex justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-40"><Send className="w-4 h-4" /> Enviar WhatsApp & Mudar p/ Pendente</button>
            </div>
          </div>
        </div>
      ) : (
        /* ABA: CRIATIVOS COM O WHATSAPP DO REVENDEDOR EMBUTIDO */
        <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl shadow-sm">
          <h2 className="text-base font-bold text-brand-red mb-2 flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Galeria de Criativos de Divulgação</h2>
          <p className="text-xs text-slate-500 mb-6">Ao clicar em baixar, o sistema substitui automaticamente o número da imagem pelo **seu WhatsApp cadastrado acima**.</p>
          
          <canvas ref={canvasRef} className="hidden" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {creatives.map(cr => (
              <div key={cr.id} className="border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-4 bg-slate-50 dark:bg-brand-dark flex flex-col justify-between">
                <div>
                  <img src={cr.imagem_url} alt={cr.titulo} className="w-full h-48 object-cover rounded-xl mb-3" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{cr.titulo}</h3>
                  <p className="text-xs text-slate-500 mt-1">{cr.descricao || 'Criativo otimizado para conversão no WhatsApp e Instagram Stories.'}</p>
                </div>
                <button 
                  onClick={() => {
                    if (!resellerPhone) {
                      alert('Por favor, informe seu número de WhatsApp no topo da tela antes de baixar a imagem.');
                      return;
                    }
                    generateCustomImage(cr.imagem_url, cr.titulo);
                  }}
                  className="mt-4 w-full bg-brand-red hover:bg-brand-redHover text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" /> Baixar Imagem com Meu Zap
                </button>
              </div>
            ))}
            {creatives.length === 0 && <p className="text-slate-400 text-xs py-10 col-span-full text-center">Nenhum criativo cadastrado pelo Admin ainda. O Administrador pode cadastrar imagens na base de dados.</p>}
          </div>
        </div>
      )}
    </div>
  );
};