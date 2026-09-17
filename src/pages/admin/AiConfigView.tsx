import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { logAuditEvent } from '../../services/auditService';
import {
  Sparkles,
  Bot,
  Sliders,
  Save,
  CheckCircle2,
  Cpu,
  Key,
  Flame,
  MessageSquareCode,
  ShieldCheck,
  Zap,
  Lock
} from 'lucide-react';

interface AiConfigState {
  defaultProvider: string;
  groqModel: string;
  geminiModel: string;
  claudeModel: string;
  nvidiaModel: string;
  openrouterModel: string;
  customEndpointUrl: string;
  temperature: number;
  maxTokens: number;
  prompts: {
    venda_direta: string;
    venda_persuasiva: string;
    venda_rapida: string;
    recuperacao: string;
  };
}

const DEFAULT_CONFIG: AiConfigState = {
  defaultProvider: 'gemini',
  groqModel: 'llama-3.3-70b-versatile',
  geminiModel: 'gemini-1.5-flash',
  claudeModel: 'claude-3-5-sonnet-20240620',
  nvidiaModel: 'meta/llama-3.1-70b-instruct',
  openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
  customEndpointUrl: '',
  temperature: 0.7,
  maxTokens: 500,
  prompts: {
    venda_direta:
      'Você é um assistente comercial de vendas MSPLAY IPTV. Escreva uma mensagem persuasiva, amigável e direta para WhatsApp oferecendo teste grátis imediato para o cliente.',
    venda_persuasiva:
      'Você é um copywriter de alta conversão para o MSPLAY CRM. Enfatize estabilidade sem travamentos, suporte 24h, canais em 4K e catálogo completo de filmes/séries.',
    venda_rapida:
      'Crie uma mensagem ultra curta e objetiva para WhatsApp, focando no envio do link de teste e liberação em 1 minuto.',
    recuperacao:
      'Crie uma mensagem amigável para cliente inativo, oferecendo uma condição especial e bônus exclusivo de renovação.'
  }
};

export const AiConfigView: React.FC = () => {
  const { session } = useAuth();
  const { addToast } = useToast();
  const [config, setConfig] = useState<AiConfigState>(DEFAULT_CONFIG);
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({
    gemini: '',
    groq: '',
    claude: '',
    nvidia: '',
    openrouter: '',
    custom: ''
  });
  const [configuredKeys, setConfiguredKeys] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState<'providers' | 'prompts' | 'playground'>('providers');
  const [saving, setSaving] = useState(false);

  // Playground state
  const [testName, setTestName] = useState('Mariana Costa');
  const [testPhone, setTestPhone] = useState('(11) 98888-7777');
  const [testType, setTestType] = useState<keyof AiConfigState['prompts']>('venda_direta');
  const [testNotes, setTestNotes] = useState('Usuária de TV Samsung, gosta de canais de futebol.');
  const [playgroundOutput, setPlaygroundOutput] = useState('');
  const [testing, setTesting] = useState(false);
  const [playgroundMeta, setPlaygroundMeta] = useState<{ provider?: string; model?: string }>({});

  const loadConfig = async () => {
    try {
      // 1. Carregar configurações de api_settings
      const { data: dbApiSettings } = await supabase.from('api_settings').select('*');
      const keyStatus: { [key: string]: boolean } = {};
      let activeProvider = DEFAULT_CONFIG.defaultProvider;
      let loadedGeminiModel = DEFAULT_CONFIG.geminiModel;
      let loadedGroqModel = DEFAULT_CONFIG.groqModel;
      let loadedClaudeModel = DEFAULT_CONFIG.claudeModel;
      let loadedNvidiaModel = DEFAULT_CONFIG.nvidiaModel;
      let loadedOpenrouterModel = DEFAULT_CONFIG.openrouterModel;
      let loadedCustomUrl = DEFAULT_CONFIG.customEndpointUrl;

      if (dbApiSettings && dbApiSettings.length > 0) {
        dbApiSettings.forEach((item: any) => {
          if (item.api_key) keyStatus[item.provider] = true;
          if (item.ativo) activeProvider = item.provider;
          if (item.provider === 'gemini' && item.default_model) loadedGeminiModel = item.default_model;
          if (item.provider === 'groq' && item.default_model) loadedGroqModel = item.default_model;
          if (item.provider === 'claude' && item.default_model) loadedClaudeModel = item.default_model;
          if (item.provider === 'nvidia' && item.default_model) loadedNvidiaModel = item.default_model;
          if (item.provider === 'openrouter' && item.default_model) loadedOpenrouterModel = item.default_model;
          if (item.provider === 'custom' && item.base_url) loadedCustomUrl = item.base_url;
        });
      }
      setConfiguredKeys(keyStatus);

      // 2. Carregar prompts e parâmetros do system_settings
      const { data: sysData } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'ai_configuration')
        .maybeSingle();

      const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...(sysData?.value || {}),
        defaultProvider: activeProvider,
        geminiModel: loadedGeminiModel,
        groqModel: loadedGroqModel,
        claudeModel: loadedClaudeModel,
        nvidiaModel: loadedNvidiaModel,
        openrouterModel: loadedOpenrouterModel,
        customEndpointUrl: loadedCustomUrl
      };

      setConfig(mergedConfig);
    } catch (err) {
      console.error('Erro ao carregar configurações de IA:', err);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      // 1. Respeitar o índice único parcial (ativo = true): desativar todos antes
      await supabase.from('api_settings').update({ ativo: false }).neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Salvar/Atualizar cada provedor em public.api_settings
      const providersList = [
        { provider: 'gemini', default_model: config.geminiModel, base_url: null, key: apiKeys.gemini },
        { provider: 'groq', default_model: config.groqModel, base_url: null, key: apiKeys.groq },
        { provider: 'claude', default_model: config.claudeModel, base_url: null, key: apiKeys.claude },
        { provider: 'nvidia', default_model: config.nvidiaModel, base_url: null, key: apiKeys.nvidia },
        { provider: 'openrouter', default_model: config.openrouterModel, base_url: null, key: apiKeys.openrouter },
        { provider: 'custom', default_model: 'gpt-4o', base_url: config.customEndpointUrl, key: apiKeys.custom }
      ];

      for (const p of providersList) {
        const isThisActive = p.provider === config.defaultProvider;
        const updatePayload: any = {
          provider: p.provider,
          default_model: p.default_model,
          base_url: p.base_url,
          ativo: isThisActive,
          updated_at: new Date().toISOString()
        };
        if (p.key && p.key.trim()) {
          updatePayload.api_key = p.key.trim();
        }

        await supabase.from('api_settings').upsert(updatePayload, { onConflict: 'provider' });
      }

      // 3. Salvar prompts e parâmetros adicionais em system_settings
      await supabase.from('system_settings').upsert({
        key: 'ai_configuration',
        value: config,
        updated_at: new Date().toISOString()
      });

      // 4. Registrar auditoria
      await logAuditEvent('update_ai_config', {
        provider: config.defaultProvider,
        temperature: config.temperature
      });

      // Recarregar status de chaves e limpar inputs de chave temporários
      setApiKeys({ gemini: '', groq: '', claude: '', nvidia: '', openrouter: '', custom: '' });
      await loadConfig();

      addToast('Configurações de IA salvas com sucesso no banco!', 'success');
    } catch (err: any) {
      addToast('Erro ao salvar configurações: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRunPlaygroundTest = async () => {
    setTesting(true);
    setPlaygroundOutput('');
    setPlaygroundMeta({});
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          contactName: testName,
          contactPhone: testPhone,
          contactNotes: testNotes,
          messageType: testType,
          customInstructions: config.prompts[testType],
          resellerPhone: '(32) 99999-9999'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na resposta do backend');
      setPlaygroundOutput(data.text);
      setPlaygroundMeta({ provider: data.provider, model: data.model });
      addToast(`Mensagem gerada com sucesso via ${data.provider?.toUpperCase()}!`, 'success');
    } catch (err: any) {
      setPlaygroundOutput(`Erro na chamada da IA: ${err.message}`);
      addToast(err.message || 'Falha ao executar teste', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-red" /> Configuração do Motor de Inteligência Artificial
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Gerencie o provedor ativo centralizado (Groq, Gemini, Claude, NVIDIA, OpenRouter), chaves de API e prompts do sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-4 py-2 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 border-b border-brand-lightBorder dark:border-brand-darkBorder pb-3">
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'providers'
              ? 'bg-brand-red text-white'
              : 'bg-slate-100 dark:bg-brand-darkCard text-slate-600 dark:text-zinc-400'
          }`}
        >
          <Cpu className="w-4 h-4" /> Provedores & Chaves de API
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'prompts'
              ? 'bg-brand-red text-white'
              : 'bg-slate-100 dark:bg-brand-darkCard text-slate-600 dark:text-zinc-400'
          }`}
        >
          <MessageSquareCode className="w-4 h-4" /> Prompts & Abordagens
        </button>
        <button
          onClick={() => setActiveTab('playground')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'playground'
              ? 'bg-brand-red text-white'
              : 'bg-slate-100 dark:bg-brand-darkCard text-slate-600 dark:text-zinc-400'
          }`}
        >
          <Flame className="w-4 h-4" /> Playground de Teste
        </button>
      </div>

      {/* Tab Content: Providers */}
      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-brand-red" /> Provedor de IA Ativo no Sistema
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-brand-dark border border-brand-lightBorder dark:border-brand-darkBorder">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                Provedor Ativo Oficial (Utilizado por todos os Revendedores)
              </label>
              <select
                value={config.defaultProvider}
                onChange={(e) => setConfig({ ...config, defaultProvider: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-darkCard font-bold text-xs outline-none focus:ring-2 focus:ring-brand-red"
              >
                <option value="gemini">✨ Google Gemini (Recomendado / Flash / Pro)</option>
                <option value="groq">⚡ Groq Cloud (Ultra Rápido - Llama 3.3 70B)</option>
                <option value="claude">🧠 Anthropic Claude 3.5 Sonnet</option>
                <option value="nvidia">🚀 NVIDIA NIM (Llama 3.1 70B Instruct)</option>
                <option value="openrouter">🌐 OpenRouter API Gateway</option>
                <option value="custom">🔌 Servidor Próprio / Endpoint OpenAI Compatível</option>
              </select>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2">
                O revendedor <b>não</b> possui permissão para trocar o provedor. Todas as abordagens geradas no sistema utilizarão este motor.
              </p>
            </div>

            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 pt-2 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-brand-red" /> Modelos e Chaves por Provedor
            </h4>

            {/* Gemini */}
            <div className={`p-3.5 rounded-xl border transition ${config.defaultProvider === 'gemini' ? 'border-brand-red bg-red-50/20 dark:bg-red-950/10' : 'border-brand-lightBorder dark:border-brand-darkBorder'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                  ✨ Google Gemini {config.defaultProvider === 'gemini' && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">ATIVO</span>}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{configuredKeys.gemini ? '🔒 Chave Salva no Banco' : '⚠️ Chave não informada'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Modelo</label>
                  <input
                    type="text"
                    value={config.geminiModel}
                    onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                    className="w-full p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark font-mono text-[11px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Nova Chave de API (Opcional)</label>
                  <input
                    type="password"
                    placeholder={configuredKeys.gemini ? '••••••••••••••••' : 'Cole a chave AIzaSy...'}
                    value={apiKeys.gemini}
                    onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                    className="w-full p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark font-mono text-[11px] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Groq */}
            <div className={`p-3.5 rounded-xl border transition ${config.defaultProvider === 'groq' ? 'border-brand-red bg-red-50/20 dark:bg-red-950/10' : 'border-brand-lightBorder dark:border-brand-darkBorder'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                  ⚡ Groq Cloud {config.defaultProvider === 'groq' && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">ATIVO</span>}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{configuredKeys.groq ? '🔒 Chave Salva no Banco' : '⚠️ Chave não informada'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Modelo</label>
                  <input
                    type="text"
                    value={config.groqModel}
                    onChange={(e) => setConfig({ ...config, groqModel: e.target.value })}
                    className="w-full p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark font-mono text-[11px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Nova Chave de API (Opcional)</label>
                  <input
                    type="password"
                    placeholder={configuredKeys.groq ? '••••••••••••••••' : 'Cole a chave gsk_...'}
                    value={apiKeys.groq}
                    onChange={(e) => setApiKeys({ ...apiKeys, groq: e.target.value })}
                    className="w-full p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark font-mono text-[11px] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Claude */}
            <div className={`p-3.5 rounded-xl border transition ${config.defaultProvider === 'claude' ? 'border-brand-red bg-red-50/20 dark:bg-red-950/10' : 'border-brand-lightBorder dark:border-brand-darkBorder'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                  🧠 Anthropic Claude {config.defaultProvider === 'claude' && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">ATIVO</span>}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{configuredKeys.claude ? '🔒 Chave Salva no Banco' : '⚠️ Chave não informada'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Modelo</label>
                  <input
                    type="text"
                    value={config.claudeModel}
                    onChange={(e) => setConfig({ ...config, claudeModel: e.target.value })}
                    className="w-full p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark font-mono text-[11px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Nova Chave de API (Opcional)</label>
                  <input
                    type="password"
                    placeholder={configuredKeys.claude ? '••••••••••••••••' : 'Cole a chave sk-ant-...'}
                    value={apiKeys.claude}
                    onChange={(e) => setApiKeys({ ...apiKeys, claude: e.target.value })}
                    className="w-full p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark font-mono text-[11px] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* NVIDIA */}
            <div className={`p-3.5 rounded-xl border transition ${config.defaultProvider === 'nvidia' ? 'border-brand-red bg-red-50/20 dark:bg-red-950/10' : 'border-brand-lightBorder dark:border-brand-darkBorder'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                  🚀 NVIDIA NIM {config.defaultProvider === 'nvidia' && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">ATIVO</span>}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{configuredKeys.nvidia ? '🔒 Chave Salva no Banco' : '⚠️ Chave não informada'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Modelo</label>
                  <input
                    type="text"
                    value={config.nvidiaModel}
                    onChange={(e) => setConfig({ ...config, nvidiaModel: e.target.value })}
                    className="w-full p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark font-mono text-[11px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Nova Chave de API (Opcional)</label>
                  <input
                    type="password"
                    placeholder={configuredKeys.nvidia ? '••••••••••••••••' : 'Cole a chave nvapi-...'}
                    value={apiKeys.nvidia}
                    onChange={(e) => setApiKeys({ ...apiKeys, nvidia: e.target.value })}
                    className="w-full p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark font-mono text-[11px] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Custom Endpoint */}
            <div className={`p-3.5 rounded-xl border transition ${config.defaultProvider === 'custom' ? 'border-brand-red bg-red-50/20 dark:bg-red-950/10' : 'border-brand-lightBorder dark:border-brand-darkBorder'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                  🔌 IA Personalizada / OpenAI Compatível {config.defaultProvider === 'custom' && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">ATIVO</span>}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{configuredKeys.custom ? '🔒 Chave Salva no Banco' : '⚠️ Sem Chave'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Endpoint URL</label>
                  <input
                    type="text"
                    placeholder="https://api.openai.com/v1/chat/completions"
                    value={config.customEndpointUrl}
                    onChange={(e) => setConfig({ ...config, customEndpointUrl: e.target.value })}
                    className="w-full p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark font-mono text-[11px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Bearer Token / Chave</label>
                  <input
                    type="password"
                    placeholder={configuredKeys.custom ? '••••••••••••••••' : 'Cole a chave/token'}
                    value={apiKeys.custom}
                    onChange={(e) => setApiKeys({ ...apiKeys, custom: e.target.value })}
                    className="w-full p-2 rounded-lg border border-brand-lightBorder dark:border-brand-darkBorder bg-white dark:bg-brand-dark font-mono text-[11px] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-red" /> Parâmetros Globais de Inferência
            </h3>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700 dark:text-zinc-300">Temperatura (Criatividade)</span>
                <span className="text-brand-red">{config.temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full accent-brand-red"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0.1 (Preciso / Focado)</span>
                <span>1.0 (Mais Criativo)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700 dark:text-zinc-300">Limite Máximo de Tokens</span>
                <span className="text-brand-red">{config.maxTokens}</span>
              </div>
              <input
                type="number"
                min={100}
                max={2000}
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 500 })}
                className="w-full p-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none text-xs font-bold"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-brand-dark border border-brand-lightBorder dark:border-brand-darkBorder space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Governança & Segurança
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                As chaves e o provedor ativo são persistidos na tabela <code>public.api_settings</code> protegida por RLS.
                O backend serverless (<code>/api/generate</code>) executa a chamada com <code>SUPABASE_SERVICE_ROLE_KEY</code>, garantindo que nenhum revendedor acesse as credenciais ou force outro provedor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Prompts */}
      {activeTab === 'prompts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-5 shadow-sm space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
              ⚡ Prompt: Venda Direta
            </h4>
            <p className="text-[11px] text-slate-400">Instruções para geração de mensagens objetivas e diretas.</p>
            <textarea
              rows={5}
              value={config.prompts.venda_direta}
              onChange={(e) =>
                setConfig({
                  ...config,
                  prompts: { ...config.prompts, venda_direta: e.target.value }
                })
              }
              className="w-full p-3 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>

          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-5 shadow-sm space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
              🎯 Prompt: Venda Persuasiva (Copywriting)
            </h4>
            <p className="text-[11px] text-slate-400">Focado em quebrar objeções e destacar qualidade 4K.</p>
            <textarea
              rows={5}
              value={config.prompts.venda_persuasiva}
              onChange={(e) =>
                setConfig({
                  ...config,
                  prompts: { ...config.prompts, venda_persuasiva: e.target.value }
                })
              }
              className="w-full p-3 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>

          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-5 shadow-sm space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
              🔥 Prompt: Venda Rápida
            </h4>
            <p className="text-[11px] text-slate-400">Mensagens instantâneas para fechamento em 1 minuto.</p>
            <textarea
              rows={5}
              value={config.prompts.venda_rapida}
              onChange={(e) =>
                setConfig({
                  ...config,
                  prompts: { ...config.prompts, venda_rapida: e.target.value }
                })
              }
              className="w-full p-3 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>

          <div className="bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-5 shadow-sm space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
              🔄 Prompt: Recuperação de Inativos
            </h4>
            <p className="text-[11px] text-slate-400">Reengajamento de clientes que não renovaram o plano.</p>
            <textarea
              rows={5}
              value={config.prompts.recuperacao}
              onChange={(e) =>
                setConfig({
                  ...config,
                  prompts: { ...config.prompts, recuperacao: e.target.value }
                })
              }
              className="w-full p-3 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>
      )}

      {/* Tab Content: Playground */}
      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-brand-red" /> Simulador de Abordagem
            </h3>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-brand-dark border border-brand-lightBorder dark:border-brand-darkBorder text-xs">
              <span className="text-slate-500">Provedor Ativo Configurado:</span>{' '}
              <b className="text-brand-red uppercase">{config.defaultProvider}</b>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Nome do Contato Teste
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Objetivo
              </label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as any)}
                className="w-full p-2.5 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold outline-none"
              >
                <option value="venda_direta">⚡ Venda Direta</option>
                <option value="venda_persuasiva">🎯 Venda Persuasiva</option>
                <option value="venda_rapida">🔥 Venda Rápida</option>
                <option value="recuperacao">🔄 Recuperação de Inativo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Notas / Perfil do Cliente
              </label>
              <textarea
                rows={2}
                value={testNotes}
                onChange={(e) => setTestNotes(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <button
              onClick={handleRunPlaygroundTest}
              disabled={testing}
              className="w-full py-2.5 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {testing ? 'Gerando resposta...' : <><Sparkles className="w-4 h-4" /> Executar Teste com Provedor Ativo</>}
            </button>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                Resultado da Geração IA
              </h3>
              <textarea
                rows={12}
                readOnly
                placeholder="A mensagem gerada pelo modelo de IA configurado aparecerá aqui..."
                value={playgroundOutput}
                className="w-full p-4 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-xs font-mono leading-relaxed outline-none"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder flex items-center justify-between text-xs text-slate-400">
              <span>Provedor Utilizado: <b>{(playgroundMeta.provider || config.defaultProvider).toUpperCase()}</b></span>
              <span>Modelo: <b>{playgroundMeta.model || 'Padrão do Banco'}</b></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

