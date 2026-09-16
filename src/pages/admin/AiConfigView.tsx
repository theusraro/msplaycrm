import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { logAuditEvent } from '../../services/auditService';
import {
  Sparkles,
  Bot,
  Sliders,
  Send,
  Save,
  CheckCircle2,
  Cpu,
  Key,
  Flame,
  MessageSquareCode,
  ShieldCheck,
  Zap
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
  defaultProvider: 'groq',
  groqModel: 'llama-3.1-70b-versatile',
  geminiModel: 'gemini-1.5-flash',
  claudeModel: 'claude-3-5-sonnet-20240620',
  nvidiaModel: 'meta/llama3-70b-instruct',
  openrouterModel: 'auto',
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
  const { addToast } = useToast();
  const [config, setConfig] = useState<AiConfigState>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'providers' | 'prompts' | 'playground'>('providers');
  const [saving, setSaving] = useState(false);

  // Playground state
  const [testName, setTestName] = useState('Mariana Costa');
  const [testPhone, setTestPhone] = useState('(11) 98888-7777');
  const [testType, setTestType] = useState<keyof AiConfigState['prompts']>('venda_direta');
  const [testNotes, setTestNotes] = useState('Usuária de TV Samsung, gosta de canais de futebol.');
  const [playgroundOutput, setPlaygroundOutput] = useState('');
  const [testing, setTesting] = useState(false);

  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'ai_configuration')
        .single();

      if (data?.value) {
        setConfig({ ...DEFAULT_CONFIG, ...data.value });
      } else {
        const local = localStorage.getItem('msplay_ai_config');
        if (local) setConfig(JSON.parse(local));
      }
    } catch (err) {
      const local = localStorage.getItem('msplay_ai_config');
      if (local) setConfig(JSON.parse(local));
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      localStorage.setItem('msplay_ai_config', JSON.stringify(config));

      await supabase.from('system_settings').upsert({
        key: 'ai_configuration',
        value: config,
        updated_at: new Date().toISOString()
      });

      await logAuditEvent('update_ai_config', {
        provider: config.defaultProvider,
        temperature: config.temperature
      });

      addToast('Configurações de IA salvas com sucesso!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Salvo localmente com sucesso', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleRunPlaygroundTest = async () => {
    setTesting(true);
    setPlaygroundOutput('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: testName,
          contactPhone: testPhone,
          contactNotes: testNotes,
          messageType: testType,
          provider: config.defaultProvider,
          customInstructions: config.prompts[testType],
          resellerPhone: '(32) 99999-9999'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na resposta do backend');
      setPlaygroundOutput(data.text);
      addToast('Mensagem gerada com sucesso!', 'success');
    } catch (err: any) {
      // Local simulated response if backend key not configured
      setPlaygroundOutput(
        `Olá ${testName}! ⚽ Tudo bem?\n\nVi que você adora futebol e possui TV Samsung! O MSPLAY tem os canais Première, SporTV e DAZN em 4K sem travamento!\n\nPosso liberar um teste grátis agora mesmo para você conferir na sua Smart TV? Me responda aqui! 🚀`
      );
      addToast('Simulação executada (Configure as chaves no backend para chamada real)', 'info');
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
            Gerencie múltiplos provedores (Groq, Gemini, Claude, Nvidia), temperatura e templates de abordagem de vendas.
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
          <Cpu className="w-4 h-4" /> Provedores & Modelos
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
              <Bot className="w-4 h-4 text-brand-red" /> Seleção de Provedores Padrão
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Provedor de IA Padrão do Sistema
              </label>
              <select
                value={config.defaultProvider}
                onChange={(e) => setConfig({ ...config, defaultProvider: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark font-bold text-xs outline-none focus:ring-2 focus:ring-brand-red"
              >
                <option value="groq">⚡ Groq Cloud (Ultra Rápido - Llama 3 70B)</option>
                <option value="gemini">✨ Google Gemini 1.5 Flash / Pro</option>
                <option value="claude">🧠 Anthropic Claude 3.5 Sonnet</option>
                <option value="nvidia">🚀 NVIDIA NIM (Llama 3 70B Instruct)</option>
                <option value="openrouter">🌐 OpenRouter API Gateway</option>
                <option value="custom">🔌 Servidor Próprio / Endpoint OpenAI Compatível</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Modelo Groq
                </label>
                <input
                  type="text"
                  value={config.groqModel}
                  onChange={(e) => setConfig({ ...config, groqModel: e.target.value })}
                  className="w-full p-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Modelo Google Gemini
                </label>
                <input
                  type="text"
                  value={config.geminiModel}
                  onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                  className="w-full p-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Modelo Claude (Anthropic)
                </label>
                <input
                  type="text"
                  value={config.claudeModel}
                  onChange={(e) => setConfig({ ...config, claudeModel: e.target.value })}
                  className="w-full p-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Modelo NVIDIA NIM
                </label>
                <input
                  type="text"
                  value={config.nvidiaModel}
                  onChange={(e) => setConfig({ ...config, nvidiaModel: e.target.value })}
                  className="w-full p-2 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none font-mono text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Endpoint Customizado (Opcional)
              </label>
              <input
                type="text"
                placeholder="https://api.openai.com/v1 ou vLLM / Ollama"
                value={config.customEndpointUrl}
                onChange={(e) => setConfig({ ...config, customEndpointUrl: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark outline-none text-xs font-mono"
              />
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-brand-darkCard border border-brand-lightBorder dark:border-brand-darkBorder rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-red" /> Parâmetros de Inferência
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

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-brand-dark border border-brand-lightBorder dark:border-brand-darkBorder">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Segurança de Chaves de API
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Todas as chaves secretas (<code>GROQ_API_KEY</code>, <code>GEMINI_API_KEY</code>, <code>ANTHROPIC_API_KEY</code>) são armazenadas de forma segura nas variáveis de ambiente do backend serverless (<code>/api/generate</code>) e nunca são expostas ao navegador do cliente.
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
              {testing ? 'Gerando resposta...' : <><Sparkles className="w-4 h-4" /> Executar Teste em Tempo Real</>}
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
                placeholder="A mensagem gerada pelo modelo de IA selecionado aparecerá aqui..."
                value={playgroundOutput}
                className="w-full p-4 rounded-xl border border-brand-lightBorder dark:border-brand-darkBorder bg-slate-50 dark:bg-brand-dark text-xs font-mono leading-relaxed outline-none"
              />
            </div>

            <div className="mt-4 pt-3 border-t border-brand-lightBorder dark:border-brand-darkBorder flex items-center justify-between text-xs text-slate-400">
              <span>Provedor: <b>{config.defaultProvider.toUpperCase()}</b></span>
              <span>Temperatura: <b>{config.temperature}</b></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
