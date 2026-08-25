import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Contact } from '../types';
import { Sparkles, Copy, Send, Check, Search, User, AlertCircle } from 'lucide-react';

export const ResellerDashboard: React.FC = () => {
  const { profile, session } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [messageType, setMessageType] = useState('cobranca');
  const [provider, setProvider] = useState<string>('groq');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!profile) return;
    const fetchContacts = async () => {
      if (profile.role === 'admin') {
        const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
        if (data) setContacts(data);
      } else {
        const { data } = await supabase.from('contact_assignments').select('contacts (*)').eq('user_id', profile.id);
        if (data) setContacts(data.map((item: any) => item.contacts).filter(Boolean));
      }
    };
    fetchContacts();
  }, [profile]);

  const handleGenerateMessage = async () => {
    if (!selectedContact) return setErrorMsg('Selecione um contato primeiro.');
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
          customInstructions
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

  const handleOpenWhatsApp = () => {
    if (!selectedContact || !generatedMessage) return;
    const phone = selectedContact.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(generatedMessage)}`, '_blank');
  };

  const filteredContacts = contacts.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard rounded-2xl p-5 shadow-sm h-[calc(100vh-140px)] flex flex-col">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3">Meus Leads</h2>
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredContacts.map(c => (
            <div key={c.id} onClick={() => setSelectedContact(c)} className={`p-3 rounded-xl border text-xs cursor-pointer ${selectedContact?.id === c.id ? 'border-brand-red bg-red-50 dark:bg-red-950/30' : 'border-brand-lightBorder dark:border-brand-darkBorder hover:border-slate-300'}`}>
              <div className="flex justify-between font-bold"><span className="flex gap-1.5"><User className="w-3.5 h-3.5 text-brand-red" />{c.nome}</span><span>{c.telefone}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-7 border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between border-b border-brand-lightBorder dark:border-brand-darkBorder pb-4 mb-4">
          <h2 className="text-base font-bold flex gap-2"><Sparkles className="w-5 h-5 text-brand-red" /> IA Generator</h2>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {['cobranca', 'lembrete', 'boas_vindas', 'oferta'].map(t => (
              <button key={t} onClick={() => setMessageType(t)} className={`py-2 px-3 rounded-xl font-bold border ${messageType === t ? 'border-brand-red bg-brand-red text-white' : 'border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark'}`}>{t.replace('_', ' ')}</button>
            ))}
          </div>
          <input type="text" placeholder="Instruções extras (opcional)" value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} className="w-full p-2.5 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red" />
          <button onClick={handleGenerateMessage} disabled={loading || !selectedContact} className="w-full bg-brand-red hover:bg-brand-redHover text-white py-2.5 rounded-xl font-bold text-xs flex justify-center gap-2 disabled:opacity-50">
            {loading ? 'Gerando...' : <><Sparkles className="w-4 h-4" /> Gerar Mensagem</>}
          </button>
        </div>

        <textarea rows={6} value={generatedMessage} onChange={(e) => setGeneratedMessage(e.target.value)} className="w-full p-3 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red" />
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={handleCopy} disabled={!generatedMessage} className="flex justify-center gap-2 py-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-xs font-bold disabled:opacity-40">{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} Copiar</button>
          <button onClick={handleOpenWhatsApp} disabled={!generatedMessage} className="flex justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-40"><Send className="w-4 h-4" /> Enviar WhatsApp</button>
        </div>
      </div>
    </div>
  );
};