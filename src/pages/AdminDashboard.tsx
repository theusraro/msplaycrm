import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { Users, Upload, UserPlus, Shield, MessageSquare, CheckCircle2, ToggleLeft, ToggleRight, Database, Settings, Key, Trash2, Image as ImageIcon, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'contacts' | 'creatives' | 'config'>('overview');
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalContacts: 0, totalMessages: 0 });
  const [completedSales, setCompletedSales] = useState<any[]>([]);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');

  // Estados para criativos
  const [creatives, setCreatives] = useState<any[]>([]);
  const [newCreativeTitle, setNewCreativeTitle] = useState('');
  const [newCreativeUrl, setNewCreativeUrl] = useState('');
  const [newCreativeDesc, setNewCreativeDesc] = useState('');

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

    // Buscar vendas concluídas por revendedores
    const { data: salesData } = await supabase
      .from('contact_assignments')
      .select('user_id, contact_id, assigned_at, contacts (nome, telefone), profiles (nome, email)')
      .eq('status', 'concluido');
    
    if (salesData) setCompletedSales(salesData);

    // Buscar criativos cadastrados
    const { data: creativesData } = await supabase.from('creatives').select('*').order('created_at', { ascending: false });
    if (creativesData) setCreatives(creativesData);

    // Buscar chaves de API
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
    const { data: { session } } = await supabase.auth.getSession();

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: newUserEmail, password: newUserPassword, nome: newUserName, role: newUserRole })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setStatusMsg({ type: 'success', text: `Usuário ${newUserName} criado com sucesso!` });
      setNewUserEmail(''); setNewUserName(''); setNewUserPassword(''); fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Erro: ${err.message}` });
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    await supabase.from('profiles').update({ ativo: !currentStatus }).eq('id', userId);
    fetchData();
  };

  const handleAddCreative = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const { error } = await supabase.from('creatives').insert({ titulo: newCreativeTitle, imagem_url: newCreativeUrl, descricao: newCreativeDesc });
    if (error) {
      setStatusMsg({ type: 'error', text: `Erro ao cadastrar criativo: ${error.message}` });
    } else {
      setStatusMsg({ type: 'success', text: 'Criativo cadastrado com sucesso!' });
      setNewCreativeTitle(''); setNewCreativeUrl(''); setNewCreativeDesc('');
      fetchData();
    }
  };

  const handleDeleteCreative = async (id: string) => {
    if (!window.confirm('Deseja excluir este criativo?')) return;
    await supabase.from('creatives').delete().eq('id', id);
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
    else setStatusMsg({ type: 'success', text: 'Chaves de IA salvas com sucesso!' });
  };

  const processData = async (parsedContacts: any[]) => {
    const validContacts = parsedContacts.map(c => {
      const rawName = c['Saved Name'] || c['Public Name'] || c['Nome'] || c['name'] || c.Name || c[0] || '';
      const rawPhone = c['Phone Number'] || c['Formatted Phone'] || c['Telefone'] || c['phone'] || c[1] || '';
      return {
        nome: String(rawName).trim() || 'Desconhecido',
        telefone: String(rawPhone).replace(/\D/g, ''),
        observacoes: 'Importação MSPLAY'
      };
    }).filter(c => c.telefone.length >= 10 && c.telefone.length <= 15);

    const uniqueContacts = Array.from(new Map(validContacts.map(item => [item.telefone, item])).values());
    if (uniqueContacts.length === 0) return setStatusMsg({ type: 'error', text: 'Nenhum contato válido encontrado.' });

    const { data, error } = await supabase.from('contacts').insert(uniqueContacts).select();
    if (error || !data) return setStatusMsg({ type: 'error', text: `Erro no banco: ${error?.message}` });

    if (selectedReseller === 'all') {
      const allUsers = users.filter(u => u.role === 'user' && u.ativo);
      const assignments: any[] = [];
      data.forEach(c => allUsers.forEach(u => assignments.push({ contact_id: c.id, user_id: u.id, status: 'novo' })));
      await supabase.from('contact_assignments').insert(assignments);
    } else if (selectedReseller === 'round_robin') {
      const allUsers = users.filter(u => u.role === 'user' && u.ativo);
      if (allUsers.length > 0) {
        const assignments = data.map((c, i) => ({ contact_id: c.id, user_id: allUsers[i % allUsers.length].id, status: 'novo' }));
        await supabase.from('contact_assignments').insert(assignments);
      }
    } else if (selectedReseller !== 'none') {
      const assignments = data.map(c => ({ contact_id: c.id, user_id: selectedReseller, status: 'novo' }));
      await supabase.from('contact_assignments').insert(assignments);
    }

    setStatusMsg({ type: 'success', text: `${data.length} contatos importados!` });
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
    } else {
      setStatusMsg({ type: 'error', text: 'Formato inválido. Use CSV, Excel ou TXT.' });
    }
  };

  const clearAllAssignments = async () => {
    if (!window.confirm("ATENÇÃO: Isso removerá os contatos de TODOS os revendedores. Tem certeza?")) return;
    await supabase.from('contact_assignments').delete().not('id', 'is', null);
    fetchData();
    setStatusMsg({ type: 'success', text: 'Atribuições limpas!' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-lightBorder dark:border-brand-darkBorder pb-4">
        <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="w-6 h-6 text-brand-red" /> Painel Admin MSPLAY</h1>
        <div className="flex flex-wrap rounded-xl bg-slate-100 dark:bg-brand-darkCard p-1 border border-brand-lightBorder dark:border-brand-darkBorder text-xs font-bold gap-1">
          <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'overview' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}>Visão Geral & Vendas</button>
          <button onClick={() => setActiveTab('users')} className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'users' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}>Revendedores</button>
          <button onClick={() => setActiveTab('contacts')} className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'contacts' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}>Contatos</button>
          <button onClick={() => setActiveTab('creatives')} className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'creatives' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}>Criativos & Posts</button>
          <button onClick={() => setActiveTab('config')} className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTab === 'config' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}><Settings className="w-3.5 h-3.5" /> IA Config</button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{statusMsg.text}</span>
        </div>
      )}

      {/* ABA: VISÃO GERAL & VENDAS DOS REVENDEDORES */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between text-slate-500 mb-2"><span className="text-xs uppercase font-bold">Revendedores Ativos</span><Users className="w-5 h-5 text-brand-red" /></div>
              <p className="text-3xl font-black">{stats.totalUsers}</p>
            </div>
            <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between text-slate-500 mb-2"><span className="text-xs uppercase font-bold">Total de Leads na Base</span><Database className="w-5 h-5 text-brand-red" /></div>
              <p className="text-3xl font-black">{stats.totalContacts}</p>
            </div>
            <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between text-slate-500 mb-2"><span className="text-xs uppercase font-bold">Vendas Fechadas (Equipe)</span><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
              <p className="text-3xl font-black text-emerald-500">{completedSales.length}</p>
            </div>
          </div>

          {/* Tabela de Auditoria de Vendas Concluídas */}
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Auditoria de Vendas Concluídas por Revendedor</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-lightBorder dark:border-brand-darkBorder text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Revendedor</th>
                    <th className="pb-3">Cliente Convertido</th>
                    <th className="pb-3">Telefone do Cliente</th>
                    <th className="pb-3 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-lightBorder dark:divide-brand-darkBorder">
                  {completedSales.map((sale, i) => (
                    <tr key={i}>
                      <td className="py-3 font-bold text-brand-red">{sale.profiles?.nome || 'Desconhecido'}</td>
                      <td className="py-3 font-semibold text-slate-800 dark:text-zinc-200">{sale.contacts?.nome}</td>
                      <td className="py-3 text-slate-500">{sale.contacts?.telefone}</td>
                      <td className="py-3 text-right text-slate-400">{new Date(sale.assigned_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {completedSales.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-slate-400">Nenhuma venda concluída registrada até o momento.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA: USUÁRIOS */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl h-fit shadow-sm">
            <h2 className="text-base font-bold text-brand-red mb-4 flex gap-2"><UserPlus className="w-4 h-4" />Novo Revendedor</h2>
            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <input type="text" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="E-mail" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <input type="password" required minLength={6} value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Senha (Mínimo 6)" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')} className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark">
                <option value="user">Revendedor</option><option value="admin">Admin</option>
              </select>
              <button type="submit" className="w-full bg-brand-red hover:bg-brand-redHover text-white py-2.5 rounded-xl font-bold">Criar Acesso</button>
            </form>
          </div>
          <div className="lg:col-span-2 border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl shadow-sm overflow-x-auto">
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

      {/* ABA: CONTATOS */}
      {activeTab === 'contacts' && (
        <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl shadow-sm">
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
              <input type="file" accept=".csv, .xlsx, .xls, .txt" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Upload className="w-8 h-8 text-brand-red mx-auto mb-2" />
              <p className="font-bold">Clique ou arraste a planilha (Excel/CSV) aqui</p>
            </div>
          </div>
        </div>
      )}

      {/* ABA: CRIATIVOS & POSTS (CADASTRO DE IMAGENS) */}
      {activeTab === 'creatives' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl h-fit shadow-sm">
            <h2 className="text-base font-bold text-brand-red mb-4 flex gap-2"><Plus className="w-4 h-4" />Cadastrar Novo Criativo</h2>
            <form onSubmit={handleAddCreative} className="space-y-3.5 text-xs">
              <input type="text" required value={newCreativeTitle} onChange={(e) => setNewCreativeTitle(e.target.value)} placeholder="Título (Ex: Banner Planos MSPLAY)" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <input type="url" required value={newCreativeUrl} onChange={(e) => setNewCreativeUrl(e.target.value)} placeholder="URL Direta da Imagem (https://...)" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <textarea value={newCreativeDesc} onChange={(e) => setNewCreativeDesc(e.target.value)} placeholder="Breve descrição ou dica de legenda" rows={3} className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <button type="submit" className="w-full bg-brand-red hover:bg-brand-redHover text-white py-2.5 rounded-xl font-bold">Salvar Criativo</button>
            </form>
          </div>

          <div className="lg:col-span-2 border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl shadow-sm">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-brand-red" /> Criativos Ativos no Painel</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {creatives.map(cr => (
                <div key={cr.id} className="border border-brand-lightBorder dark:border-brand-darkBorder rounded-xl p-3 bg-slate-50 dark:bg-brand-dark flex flex-col justify-between">
                  <div>
                    <img src={cr.imagem_url} alt={cr.titulo} className="w-full h-32 object-cover rounded-lg mb-2" />
                    <p className="font-bold text-xs">{cr.titulo}</p>
                  </div>
                  <button onClick={() => handleDeleteCreative(cr.id)} className="mt-3 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-950 dark:text-red-400 py-1.5 rounded-lg font-bold text-xs">Excluir Criativo</button>
                </div>
              ))}
              {creatives.length === 0 && <p className="text-xs text-slate-400 col-span-full py-6 text-center">Nenhum criativo cadastrado.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ABA: CONFIGURAÇÃO DE IA */}
      {activeTab === 'config' && (
        <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl max-w-2xl shadow-sm">
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