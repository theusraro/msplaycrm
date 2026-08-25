import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import {
  Users, Upload, UserPlus, Shield, MessageSquare,
  CheckCircle2, ToggleLeft, ToggleRight, Database, Settings, Key
} from 'lucide-react';
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

  const [selectedReseller, setSelectedReseller] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados para as chaves de API
  const [apiKeys, setApiKeys] = useState({ groq: '', nvidia: '', openrouter: '' });
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  const fetchData = async () => {
    const { data: profilesData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (profilesData) setUsers(profilesData);

    const { count: contactsCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
    const { count: msgCount } = await supabase.from('messages_log').select('*', { count: 'exact', head: true });

    setStats({
      totalUsers: profilesData?.length || 0,
      totalContacts: contactsCount || 0,
      totalMessages: msgCount || 0
    });

    // Buscar chaves salvas
    const { data: keysData } = await supabase.from('api_settings').select('*');
    if (keysData) {
      const keysObj = { groq: '', nvidia: '', openrouter: '' };
      keysData.forEach(k => { if (k.provider in keysObj) keysObj[k.provider as keyof typeof keysObj] = k.api_key; });
      setApiKeys(keysObj);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const { error } = await supabase.auth.signUp({
      email: newUserEmail,
      password: newUserPassword,
      options: { data: { nome: newUserName, role: newUserRole } }
    });

    if (error) {
      setStatusMsg({ type: 'error', text: `Erro: ${error.message}` });
    } else {
      setStatusMsg({ type: 'success', text: `Usuário ${newUserName} criado!` });
      setNewUserEmail(''); setNewUserName(''); setNewUserPassword('');
      fetchData();
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    await supabase.from('profiles').update({ ativo: !currentStatus }).eq('id', userId);
    fetchData();
  };

  const saveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingKeys(true);
    setStatusMsg(null);

    const updates = [
      { provider: 'groq', api_key: apiKeys.groq },
      { provider: 'nvidia', api_key: apiKeys.nvidia },
      { provider: 'openrouter', api_key: apiKeys.openrouter }
    ].filter(k => k.api_key.trim() !== ''); // Só salva o que não estiver vazio

    const { error } = await supabase.from('api_settings').upsert(updates);
    
    setIsSavingKeys(false);
    if (error) {
      setStatusMsg({ type: 'error', text: `Erro ao salvar chaves: ${error.message}` });
    } else {
      setStatusMsg({ type: 'success', text: 'Chaves de IA salvas com sucesso!' });
    }
  };

  // Leitor Inteligente de Arquivos (Excel, CSV, TXT, vCard)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMsg(null);
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    const processData = async (parsedContacts: any[]) => {
      const validContacts = parsedContacts.map(c => ({
        nome: String(c.nome || c.Name || c.Nome || c[0] || 'Desconhecido').trim(),
        telefone: String(c.telefone || c.Phone || c.Telefone || c[1] || '').replace(/\D/g, ''),
        observacoes: String(c.observacoes || c.Notes || c[2] || `Importado via ${fileExt}`).trim()
      })).filter(c => c.telefone.length >= 8); // Filtra só os que têm telefone válido

      if (validContacts.length === 0) {
        setStatusMsg({ type: 'error', text: 'Nenhum contato válido encontrado.' });
        return;
      }

      const { data, error } = await supabase.from('contacts').insert(validContacts).select();
      
      if (error || !data) {
        setStatusMsg({ type: 'error', text: `Erro no banco: ${error?.message}` });
        return;
      }

      if (selectedReseller) {
        const assignments = data.map(c => ({ contact_id: c.id, user_id: selectedReseller }));
        await supabase.from('contact_assignments').insert(assignments);
      }

      setStatusMsg({ type: 'success', text: `${data.length} contatos importados e salvos!` });
      fetchData();
    };

    if (fileExt === 'csv' || fileExt === 'txt') {
      Papa.parse(file, {
        complete: (results) => processData(results.data),
        header: true, // Tenta usar a primeira linha como cabeçalho
        skipEmptyLines: true
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        processData(data);
      };
      reader.readAsBinaryString(file);
    } else if (fileExt === 'vcf') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const vcards = text.split('BEGIN:VCARD');
        const extracted = vcards.map(card => {
          const nameMatch = card.match(/FN:(.+)/);
          const phoneMatch = card.match(/TEL.*:(.+)/);
          if (phoneMatch) {
            return { nome: nameMatch ? nameMatch[1] : 'Contato', telefone: phoneMatch[1] };
          }
          return null;
        }).filter(Boolean);
        processData(extracted);
      };
      reader.readAsText(file);
    } else {
      setStatusMsg({ type: 'error', text: 'Formato não suportado. Use CSV, Excel, TXT ou VCF.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-lightBorder dark:border-brand-darkBorder pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-red" />
            Painel Geral do Administrador
          </h1>
        </div>
        <div className="flex flex-wrap rounded-xl bg-slate-100 dark:bg-brand-darkCard p-1 border border-brand-lightBorder dark:border-brand-darkBorder text-xs font-bold">
          <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'overview' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}>Visão Geral</button>
          <button onClick={() => setActiveTab('users')} className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'users' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}>Revendedores</button>
          <button onClick={() => setActiveTab('contacts')} className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'contacts' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}>Importar Contatos</button>
          <button onClick={() => setActiveTab('config')} className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${activeTab === 'config' ? 'bg-brand-red text-white' : 'text-slate-600 dark:text-zinc-400'}`}><Settings className="w-3.5 h-3.5" /> IA Config</button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{statusMsg.text}</span>
        </div>
      )}

      {/* ABA: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs uppercase font-bold tracking-wider">Revendedores</span>
              <Users className="w-5 h-5 text-brand-red" />
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</p>
          </div>
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs uppercase font-bold tracking-wider">Total de Leads</span>
              <Database className="w-5 h-5 text-brand-red" />
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalContacts}</p>
          </div>
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs uppercase font-bold tracking-wider">Mensagens Geradas</span>
              <MessageSquare className="w-5 h-5 text-brand-red" />
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalMessages}</p>
          </div>
        </div>
      )}

      {/* ABA: USUÁRIOS */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl shadow-sm h-fit">
            <h2 className="text-base font-bold text-brand-red mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4" />Novo Revendedor</h2>
            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <input type="text" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="E-mail" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <input type="password" required minLength={6} value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Senha (Mínimo 6)" className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark" />
              <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')} className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark">
                <option value="user">Revendedor</option>
                <option value="admin">Administrador</option>
              </select>
              <button type="submit" className="w-full bg-brand-red hover:bg-brand-redHover text-white py-2.5 rounded-xl font-bold">Criar Acesso</button>
            </form>
          </div>
          <div className="lg:col-span-2 border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl shadow-sm overflow-x-auto">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Revendedores Cadastrados</h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-lightBorder dark:border-brand-darkBorder text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Nome / E-mail</th><th className="pb-3">Status</th><th className="pb-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-lightBorder dark:divide-brand-darkBorder">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="py-3"><p className="font-bold">{u.nome}</p><p className="text-slate-400">{u.email}</p></td>
                    <td className="py-3"><span className={`font-bold ${u.ativo ? 'text-green-500' : 'text-red-500'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="py-3 text-right">
                      <button onClick={() => handleToggleUserStatus(u.id, u.ativo)} className="p-1.5 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder hover:border-brand-red">
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
          <h2 className="text-base font-bold text-brand-red mb-2 flex items-center gap-2"><Upload className="w-4 h-4" />Importação Múltiplos Formatos</h2>
          <p className="text-xs text-slate-500 mb-6">Suporta arquivos: <b>.xlsx (Excel), .csv, .txt e .vcf (vCard)</b></p>
          
          <div className="space-y-4 text-xs">
            <select value={selectedReseller} onChange={(e) => setSelectedReseller(e.target.value)} className="w-full max-w-md p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark">
              <option value="">Não atribuir agora (Apenas salvar na base)</option>
              {users.filter(u => u.role === 'user').map(u => (<option key={u.id} value={u.id}>{u.nome}</option>))}
            </select>
            
            <div className="relative border-2 border-dashed border-brand-red/50 rounded-xl p-8 text-center hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer">
              <input type="file" accept=".csv, .xlsx, .xls, .txt, .vcf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Upload className="w-8 h-8 text-brand-red mx-auto mb-2" />
              <p className="font-bold text-slate-700 dark:text-zinc-300">Clique ou arraste a planilha / vCard aqui</p>
            </div>
          </div>
        </div>
      )}

      {/* ABA: CONFIGURAÇÃO DE IA (CHAVES API) */}
      {activeTab === 'config' && (
        <div className="border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard p-6 rounded-2xl shadow-sm max-w-2xl">
          <h2 className="text-base font-bold text-brand-red mb-2 flex items-center gap-2"><Key className="w-4 h-4" />Gerenciamento de API Keys (IA)</h2>
          <p className="text-xs text-slate-500 mb-6">As chaves salvas aqui são injetadas no servidor. Seus revendedores não têm acesso a essa tela nem às suas chaves.</p>
          
          <form onSubmit={saveApiKeys} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 dark:text-zinc-400 mb-1">Groq API Key</label>
              <input type="password" value={apiKeys.groq} onChange={(e) => setApiKeys({...apiKeys, groq: e.target.value})} placeholder="gsk_..." className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark focus:ring-2 focus:ring-brand-red outline-none" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-zinc-400 mb-1">NVIDIA API Key</label>
              <input type="password" value={apiKeys.nvidia} onChange={(e) => setApiKeys({...apiKeys, nvidia: e.target.value})} placeholder="nvapi-..." className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark focus:ring-2 focus:ring-brand-red outline-none" />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-zinc-400 mb-1">OpenRouter API Key</label>
              <input type="password" value={apiKeys.openrouter} onChange={(e) => setApiKeys({...apiKeys, openrouter: e.target.value})} placeholder="sk-or-v1-..." className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark focus:ring-2 focus:ring-brand-red outline-none" />
            </div>
            <button type="submit" disabled={isSavingKeys} className="bg-brand-red hover:bg-brand-redHover text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow mt-4">
              {isSavingKeys ? 'Salvando...' : 'Atualizar Chaves de Segurança'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};