import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { logAuditEvent } from '../../services/auditService';
import { useToast } from '../../contexts/ToastContext';
import {
  Bot,
  Key,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  Server,
  Cpu,
  Save,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export const AiConfigView: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [keys, setKeys] = useState({
    groq: '',
    gemini: '',
    claude: '',
    nvidia: '',
    openrouter: '',
    custom_key: '',
    custom_url: '',
    custom_model: '',
  });

  const [defaultProvider, setDefaultProvider] = useState('groq');
  const [systemPrompt, setSystemPrompt] = useState(
    'Você é o assistente virtual de vendas de alta conversão da MSPLAY (serviço premium de streaming).'
  );

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('api_settings').select('*');
      if (error) throw error;

      if (data) {
        const kObj = {
          groq: '',
          gemini: '',
          claude: '',
          nvidia: '',
          openrouter: '',
          custom_key: '',
          custom_url: '',
          custom_model: '',
        };

        data.forEach((item) => {
          if (item.provider === 'custom') {
            kObj.custom_key = item.api_key || '';
            kObj.custom_url = item.base_url || '';
            kObj.custom_model = item.default_model || '';
          } else if (item.provider in kObj) {
            (kObj as any)[item.provider] = item.api_key || '';
          }
          if (item.system_prompt) {
            setSystemPrompt(item.system_prompt);
          }
        });
        setKeys(kObj);
      }
    } catch (err: any) {
      console.error('Erro ao buscar configs de IA:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates = [
        { provider: 'groq', api_key: keys.groq, system_prompt: systemPrompt },
        { provider: 'gemini', api_key: keys.gemini, system_prompt: systemPrompt },
        { provider: 'claude', api_key: keys.claude, system_prompt: systemPrompt },
        { provider: 'nvidia', api_key: keys.nvidia, system_prompt: systemPrompt },
        { provider: 'openrouter', api_key: keys.openrouter, system_prompt: systemPrompt },
        {
          provider: 'custom',
          api_key: keys.custom_key,
          base_url: keys.custom_url,
          default_model: keys.custom_model,
          system_prompt: systemPrompt,
        },
      ].filter((k) => k.api_key.trim() !== '' || k.provider === 'custom');

      const { error } = await supabase.from('api_settings').upsert(updates, { onConflict: 'provider' });
      if (error) throw error;

      await logAuditEvent({
        acao: 'Atualização de Configurações de IA',
        entidade: 'api_settings',
        detalhes: {
          provedoresConfigurados: updates.map((u) => u.provider),
          defaultProvider,
        },
      });

      success('Configurações de IA salvas com segurança no backend!');
    } catch (err: any) {
      toastError(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Configuração da Engine de Inteligência Artificial"
        subtitle="Gerencie provedores de LLM, chaves de API e prompts do assistente de vendas da equipe."
        icon={Bot}
      />

      {/* Banner de Arquitetura Segura */}
      <div className="rounded-2xl border border-emerald-950/60 bg-emerald-950/20 p-5 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="text-xs space-y-1">
          <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
            Arquitetura de Segurança de IA Ativa
          </h3>
          <p className="text-zinc-300 leading-relaxed">
            As chamadas de IA ocorrem exclusivamente através do endpoint serverless protegido (<code className="text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded font-mono">/api/generate</code>).
            Nenhuma chave de API ou segredo é exposto no bundle do navegador ou aos revendedores.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Provedores de IA */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-[#121212] p-6 space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-red" /> Chaves de API dos Provedores
          </h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-zinc-300 mb-1 flex items-center justify-between">
                <span>Groq API Key (Llama 3.3 70B - Ultra Rápido)</span>
                <span className="text-[10px] text-zinc-500">Recomendado</span>
              </label>
              <input
                type="password"
                placeholder="gsk_..."
                value={keys.groq}
                onChange={(e) => setKeys({ ...keys, groq: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white font-mono focus:border-brand-red focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">
                Google Gemini API Key (Gemini 1.5 Pro / Flash)
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={keys.gemini}
                onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white font-mono focus:border-brand-red focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">
                Anthropic Claude API Key (Claude 3.5 Sonnet)
              </label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={keys.claude}
                onChange={(e) => setKeys({ ...keys, claude: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white font-mono focus:border-brand-red focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">
                NVIDIA NIM API Key (Llama 3.1 70B Instruct)
              </label>
              <input
                type="password"
                placeholder="nvapi-..."
                value={keys.nvidia}
                onChange={(e) => setKeys({ ...keys, nvidia: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white font-mono focus:border-brand-red focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">
                OpenRouter API Key (Multi-Modelos)
              </label>
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={keys.openrouter}
                onChange={(e) => setKeys({ ...keys, openrouter: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white font-mono focus:border-brand-red focus:outline-none"
              />
            </div>

            {/* Provedor Customizado / OpenAI / Local */}
            <div className="pt-4 border-t border-zinc-800/80 space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-brand-red" /> IA Customizada (OpenAI / LM Studio / Ollama)
              </h4>
              <input
                type="text"
                placeholder="Base URL (Ex: https://api.openai.com/v1/chat/completions)"
                value={keys.custom_url}
                onChange={(e) => setKeys({ ...keys, custom_url: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white font-mono text-[11px] focus:border-brand-red focus:outline-none"
              />
              <input
                type="text"
                placeholder="Nome do Modelo (Ex: gpt-4o ou mistral:latest)"
                value={keys.custom_model}
                onChange={(e) => setKeys({ ...keys, custom_model: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white font-mono text-[11px] focus:border-brand-red focus:outline-none"
              />
              <input
                type="password"
                placeholder="API Key Personalizada"
                value={keys.custom_key}
                onChange={(e) => setKeys({ ...keys, custom_key: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-white font-mono text-[11px] focus:border-brand-red focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Prompt Base & Configurações de Abordagem */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-red" /> Instruções do Sistema (Prompt)
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Defina a persona, o tom de voz e as regras de persuasão utilizadas pela IA ao gerar abordagens para os revendedores.
            </p>

            <textarea
              rows={8}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-white focus:border-brand-red focus:outline-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-brand-red hover:bg-brand-redHover py-3 text-xs font-bold text-white shadow-lg shadow-brand-red/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Salvando Configurações...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Salvar Configurações de IA
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
