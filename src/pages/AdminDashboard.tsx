import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { Users, Upload, UserPlus, Shield, MessageSquare, CheckCircle2, ToggleLeft, ToggleRight, Database, Settings, Key, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'contacts' | 'config'>('overview');
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalContacts: 0, totalMessages: 0 });

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');

  const [selectedReseller, setSelectedReseller] = useState<string>('all');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [apiKeys, setApiKeys] = useState({ groq: '', nvidia: '', openrouter: '', gemini: '', claude: '', custom_key: '', custom_url: '', custom_model: '' });
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  const fetchData = async () => {
    const { data: profilesData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (profilesData) setUsers(profilesData);

    const { count: contactsCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
    const { count: msgCount } = await supabase.from('messages_log').select('*', { count: 'exact', head: true });

    setStats({ totalUsers: profilesData?.length || 0, totalContacts: contactsCount || 0, totalMessages: msgCount || 0 });

    const { data: keysData } = await supabase.from('api_settings').select('*');
    if (keysData) {
      const keysObj = { groq: '', nvidia: '', openrouter: '', gemini: '', claude: '', custom_key: '', custom_url: '', custom_model: '' };
      keysData.forEach(k => {
        if (k.provider === 'custom') {
           keysObj.custom_key = k.api_key;
           keysObj.custom_url = k.base_url || '';
           keysObj.custom_model = k.default_model || '';
        } else if (k.provider in keysObj) {
           (keysObj as any)[k.provider] = k.api_key; 
        }
      });
      setApiKeys(keysObj);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const { error } = await supabase.auth.signUp({
      email: newUserEmail, password: newUserPassword,
      options: { data: { nome: newUserName, role: newUserRole } }
    });
    if (error) setStatusMsg({ type: 'error', text: `Erro: ${error.message}` });
    else {
      setStatusMsg({ type: 'success', text: `Usuário criado!` });
      setNewUserEmail(''); setNewUserName(''); setNewUserPassword(''); fetchData();
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    await supabase.from('profiles').update({ ativo: !currentStatus }).eq('id', userId);
    fetchData();
  };

  const saveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingKeys(true); setStatusMsg(null);
    const updates = [
      { provider: 'groq', api_key: apiKeys.groq },
      { provider: 'nvidia', api_key: apiKeys.nvidia },
      { provider: 'openrouter', api_key: apiKeys.openrouter },
      { provider: 'gemini', api_key: apiKeys.gemini },
      { provider: 'claude', api_key: apiKeys.claude },
      { provider: 'custom', api_key: apiKeys.custom_key, base_url: apiKeys.custom_url, default_model: apiKeys.custom_model }
    ].filter(k => k.api_key.trim() !== '');

    const { error } = await supabase.from('api_settings').upsert(updates);
    setIsSavingKeys(false);
    if (error) setStatusMsg({ type: 'error', text: `Erro: ${error.message}` });
    else setStatusMsg({ type: 'success', text: 'Chaves de IA salvas!' });
  };

  const processData = async (parsedContacts: any[]) => {
    const validContacts = parsedContacts.map(c => {
      // Captura colunas do WhatsApp Export e outros CSVs
      const rawName = c['Saved Name'] || c['Public Name'] || c['Nome'] || c['name'] || c.Name || c[0] || '';
      const rawPhone = c['Phone Number'] || c['Formatted Phone'] || c['Telefone'] || c['phone'] || c[1] || '';
      
      return {
        nome: String(rawName).trim() || 'Desconhecido',
        telefone: String(rawPhone).replace(/\D/g, ''),
        observacoes: 'Importação MSPLAY'
      };
    }).filter(c => c.telefone.length >= 10 && c.telefone.length <= 15);

    const uniqueContacts = Array.from(new Map(validContacts.map(item => [item.telefone, item])).values());
    
    if (uniqueContacts.length === 0) {
        return setStatusMsg({ type: 'error', text: 'Nenhum contato válido encontrado (verifique formato e telefone).' });
    }

    const { data, error } = await supabase.from('contacts').insert(uniqueContacts).select();
    if (error || !data) return setStatusMsg({ type: 'error', text: `Erro no banco: ${error?.message}` });

    if (selectedReseller === 'all') {
      const allUsers = users.filter(u => u.role === 'user' && u.ativo);
      const assignments: any[] = [];
      data.forEach(c => allUsers.forEach(u => assignments.push({ contact_id: c.id, user_id: u.id })));
      await supabase.from('contact_assignments').insert(assignments);
    } else if (selectedReseller === 'round_robin') {
      const allUsers = users.filter(u => u.role === 'user' && u.ativo);
      if (allUsers.length > 0) {
        const assignments = data.map((c, i) => ({ contact_id: c.id, user_id: allUsers[i % allUsers.length].id }));
        await supabase.from('contact_assignments').insert(assignments);
      }
    } else if (selectedReseller !== 'none') {
      const assignments = data.map(c => ({ contact_id: c.id, user_id: selectedReseller }));
      await supabase.from('contact_assignments').insert(assignments);
    }

    setStatusMsg({ type: 'success', text: `${data.length} contatos importados com sucesso!` });
    fetchData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg(null);
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv' || fileExt === 'txt') {
      Papa.parse(file, { complete: (res) => processData(res.data), header: true, skipEmptyLines: true });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        processData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
      };
      reader.readAsBinaryString(file);
    } else if (fileExt === 'vcf') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const extracted = text.split('BEGIN:VCARD').map(card => {
          const nameMatch = card.match(/FN:(.+)/);
          const phoneMatch = card.match(/TEL.*:(.+)/);
          if (phoneMatch) return { nome: nameMatch ? nameMatch[1] : 'Contato', telefone: phoneMatch[1] };
          return null;
        }).filter(Boolean);
        processData(extracted);
      };
      reader.readAsText(file);
    } else {
      setStatusMsg({ type: 'error', text: 'Formato inválido. Use CSV, Excel, TXT ou VCF.' });
    }
  };

  const clearAllAssignments = async () => {
    if (!window.confirm("ATENÇÃO: Isso removerá os contatos de TODOS os revendedores. Eles continuarão salvos na base, mas ninguém poderá vê-los. Tem certeza?")) return;
    const { error } = await supabase.from('contact_assignments').delete().not('id', 'is', null);
    if (error) setStatusMsg({ type: 'error', text: `Erro: ${error.message}` });
    else setStatusMsg({ type: 'success', text: 'Todas as atribuições foram removidas!' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-lightBorder dark:border-brand-darkBorder pb-4">
        <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="w-6 h-6 text-brand-red" /> Admin MSPLAY</h1>
        <div className="flex flex-wrap rounded-xl bg-slate-100 dark:bg-brand-darkCard p-1 border border-brand-lightBorder dark:border-brand-darkBorder text-xs font-bold">
          <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'overview' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}>Visão Geral</button>
          <button onClick={() => setActiveTab('users')} className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'users' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}>Revendedores</button>
          <button onClick={() => setActiveTab('contacts')} className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'contacts' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}>Contatos</button>
          <button onClick={() => setActiveTab('config')} className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTab === 'config' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}><Settings className="w-3.5 h-3.5" /> IA Config</button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{statusMsg.text}</span>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-5 rounded-2xl">
            <div className="flex justify-between text-slate-500 mb-2"><span className="text-xs uppercase font-bold">Revendedores</span><Users className="w-5 h-5 text-brand-red" /></div>
            <p className="text-3xl font-black">{stats.totalUsers}</p>
          </div>
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-5 rounded-2xl">
            <div className="flex justify-between text-slate-500 mb-2"><span className="text-xs uppercase font-bold">Leads</span><Database className="w-5 h-5 text-brand-red" /></div>
            <p className="text-3xl font-black">{stats.totalContacts}</p>
          </div>
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-5 rounded-2xl">
            <div className="flex justify-between text-slate-500 mb-2"><span className="text-xs uppercase font-bold">Mensagens IA</span><MessageSquare className="w-5 h-5 text-brand-red" /></div>
            <p className="text-3xl font-black">{stats.totalMessages}</p>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl h-fit">
            <h2 className="text-base font-bold text-brand-red mb-4 flex gap-2"><UserPlus className="w-4 h-4" />Novo Revendedor</h2>
            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <input type="text" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="E-mail" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <input type="password" required minLength={6} value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Senha (Mínimo 6)" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')} className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark">
                <option value="user">Revendedor</option><option value="admin">Admin</option>
              </select>
              <button type="submit" className="w-full bg-brand-red hover:bg-brand-redHover text-white py-2.5 rounded-xl font-bold">Criar</button>
            </form>
          </div>
          <div className="lg:col-span-2 border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl overflow-x-auto">
            <h2 className="text-base font-bold mb-4">Revendedores Cadastrados</h2>
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-brand-lightBorder text-slate-400 uppercase"><th className="pb-3">Nome / E-mail</th><th className="pb-3">Status</th><th className="pb-3 text-right">Ação</th></tr></thead>
              <tbody className="divide-y divide-brand-lightBorder">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="py-3"><p className="font-bold">{u.nome}</p><p className="text-slate-400">{u.email}</p></td>
                    <td className="py-3"><span className={`font-bold ${u.ativo ? 'text-green-500' : 'text-red-500'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="py-3 text-right">
                      <button onClick={() => handleToggleUserStatus(u.id, u.ativo)} className="p-1.5 rounded-lg border border-brand-lightBorder hover:border-brand-red">
                        {u.ativo ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-brand-red flex gap-2"><Upload className="w-4 h-4" /> Importação de Contatos</h2>
            <button onClick={clearAllAssignments} className="bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:text-red-400 px-4 py-2 rounded-xl text-xs font-bold flex gap-2 transition"><Trash2 className="w-4 h-4" /> Desatribuir Todos</button>
          </div>
          
          <div className="space-y-4 text-xs">
            <label className="block font-bold">Regra de Atribuição (Ao importar):</label>
            <select value={selectedReseller} onChange={(e) => setSelectedReseller(e.target.value)} className="w-full max-w-md p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark">
              <option value="round_robin">Distribuir Igualmente p/ todos (Round Robin)</option>
              <option value="all">Atribuir os mesmos para TODOS os revendedores</option>
              <option value="none">Não atribuir a ninguém (Só salvar na base)</option>
              <optgroup label="Revendedor Específico">
                {users.filter(u => u.role === 'user' && u.ativo).map(u => (<option key={u.id} value={u.id}>{u.nome}</option>))}
              </optgroup>
            </select>
            
            <div className="relative border-2 border-dashed border-brand-red/50 rounded-xl p-8 text-center hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer">
              <input type="file" accept=".csv, .xlsx, .xls, .txt, .vcf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Upload className="w-8 h-8 text-brand-red mx-auto mb-2" />
              <p className="font-bold">Clique ou arraste a planilha / vCard aqui</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl max-w-2xl">
          <h2 className="text-base font-bold text-brand-red mb-4 flex gap-2"><Key className="w-4 h-4" />Configuração de APIs de IA</h2>
          <form onSubmit={saveApiKeys} className="space-y-4 text-xs">
            <div><label className="block font-bold mb-1">Groq API Key</label><input type="password" value={apiKeys.groq} onChange={(e) => setApiKeys({...apiKeys, groq: e.target.value})} className="w-full p-2.5 rounded-xl border border-brand-lightBorder bg-slate-50 dark:bg-brand-dark" /></div>
            <div><label className="block font-bold mb-1">Google Gemini API Key</label><input type="password" value={apiKeys.gemini} onChange={(e) => setApiKeys({...apiKeys, gemini: e.target.value})} className="w-full p-2.5 rounded-xl border border-brand-lightBorder bg-slate-50 dark:bg-brand-dark" /></div>
            <div><label className="block font-bold mb-1">Anthropic Claude API Key</label><input type="password" value={apiKeys.claude} onChange={(e) => setApiKeys({...apiKeys, claude: e.target.value})} className="w-full p-2.5 rounded-xl border border-brand-lightBorder bg-slate-50 dark:bg-brand-dark" /></div>
            <div><label className="block font-bold mb-1">NVIDIA API Key</label><input type="password" value={apiKeys.nvidia} onChange={(e) => setApiKeys({...apiKeys, nvidia: e.target.value})} className="w-full p-2.5 rounded-xl border border-brand-lightBorder bg-slate-50 dark:bg-brand-dark" /></div>
            <div><label className="block font-bold mb-1">OpenRouter API Key</label><input type="password" value={apiKeys.openrouter} onChange={(e) => setApiKeys({...apiKeys, openrouter: e.target.value})} className="w-full p-2.5 rounded-xl border border-brand-lightBorder bg-slate-50 dark:bg-brand-dark" /></div>
            
            <div className="pt-4 border-t border-brand-lightBorder mt-4">
              <h3 className="font-bold text-brand-red mb-2">IA Personalizada (Ex: OpenAI ou Local)</h3>
              <input type="text" placeholder="Base URL (Ex: https://api.openai.com/v1/chat/completions)" value={apiKeys.custom_url} onChange={(e) => setApiKeys({...apiKeys, custom_url: e.target.value})} className="w-full mb-2 p-2.5 rounded-xl border border-brand-lightBorder bg-slate-50 dark:bg-brand-dark" />
              <input type="text" placeholder="Model Name (Ex: gpt-4o)" value={apiKeys.custom_model} onChange={(e) => setApiKeys({...apiKeys, custom_model: e.target.value})} className="w-full mb-2 p-2.5 rounded-xl border border-brand-lightBorder bg-slate-50 dark:bg-brand-dark" />
              <input type="password" placeholder="API Key Personalizada" value={apiKeys.custom_key} onChange={(e) => setApiKeys({...apiKeys, custom_key: e.target.value})} className="w-full p-2.5 rounded-xl border border-brand-lightBorder bg-slate-50 dark:bg-brand-dark" />
            </div>

            <button type="submit" disabled={isSavingKeys} className="bg-brand-red hover:bg-brand-redHover text-white px-6 py-2.5 rounded-xl font-bold flex gap-2">
              {isSavingKeys ? 'Salvando...' : 'Salvar Todas as Chaves'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};