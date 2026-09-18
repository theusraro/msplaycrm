import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Configuração interna do servidor incompleta (SUPABASE_URL ou chaves ausentes).' });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);

  const token = (typeof authHeader === 'string' ? authHeader : authHeader[0] || '').replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sessão inválida' });

  // Ignorar qualquer provider ou model enviado pelo cliente
  const { prompt, contactName, contactNotes, messageType, customInstructions, resellerPhone } = req.body;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Buscar o único provedor ativo no banco de dados
  const { data: activeConfig, error: configError } = await supabaseAdmin
    .from('api_settings')
    .select('provider, api_key, default_model, base_url, system_prompt')
    .eq('ativo', true)
    .maybeSingle();

  if (configError || !activeConfig || !activeConfig.provider) {
    return res.status(503).json({ error: 'Nenhum provedor de IA está ativo. Entre em contato com o administrador.' });
  }

  const provider = activeConfig.provider.toLowerCase();
  const AI_KEY = activeConfig.api_key || process.env[`${provider.toUpperCase()}_API_KEY`];

  if (!AI_KEY) {
    return res.status(500).json({ error: `Chave de API não configurada para o provedor ativo (${provider}). Configure no Painel Admin.` });
  }

  // Mapeamento dos objetivos de abordagem comercial
  let objectivePrompt = 'Abordagem geral';
  if (messageType === 'venda_direta') {
    objectivePrompt = 'Venda Direta: Seja objetivo, mostre o valor do streaming MSPLAY direto ao ponto, cite preço/planos e chame para fechar.';
  } else if (messageType === 'venda_persuasiva') {
    objectivePrompt = 'Venda Persuasiva: Foque em quebrar objeções, mostre a qualidade superior, estabilidade dos servidores e os benefícios de ter o melhor entretenimento.';
  } else if (messageType === 'venda_rapida') {
    objectivePrompt = 'Venda Rápida (Curta e Impactante): Mensagem curta, instigante, ideal para WhatsApp, gerando curiosidade e desejo imediato.';
  } else if (messageType === 'recuperacao') {
    objectivePrompt = 'Recuperação de Cliente / Inativo: Abordagem amigável para reativar clientes antigos ou leads que pararam de responder, oferecendo novidades.';
  }

  const systemInstruction = activeConfig.system_prompt || `Você é o assistente virtual de vendas de alta conversão da MSPLAY (serviço premium de streaming).
Sua missão é gerar uma mensagem persuasiva para o WhatsApp.
Regras:
- Objetivo da Abordagem: ${objectivePrompt}
- Cliente: ${contactName || 'Cliente'}. Informações: ${contactNotes || 'Nenhuma'}.
- Contato do Revendedor para atendimento/PIX: ${resellerPhone || 'Falar no chat'}.
- Use emojis com moderação. Retorne APENAS a mensagem pronta para envio.`;

  const userContent = prompt || `${customInstructions ? `Instruções extras: ${customInstructions}` : ''}`;
  let generatedText = '';
  let usedModel = activeConfig.default_model;

  try {
    if (provider === 'gemini') {
      usedModel = activeConfig.default_model || 'gemini-1.5-flash';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${usedModel}:generateContent?key=${AI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction + "\n\n" + userContent }] }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'claude') {
      usedModel = activeConfig.default_model || 'claude-3-5-sonnet-20240620';
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: usedModel, max_tokens: 1024, system: systemInstruction, messages: [{ role: 'user', content: userContent }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      generatedText = data.content?.[0]?.text || '';
    } else if (provider === 'custom') {
      usedModel = activeConfig.default_model || 'gpt-4o';
      if (!activeConfig.base_url) throw new Error('Base URL não configurada para a IA Personalizada');
      const response = await fetch(activeConfig.base_url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: usedModel, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      generatedText = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'groq') {
      usedModel = activeConfig.default_model || 'llama-3.3-70b-versatile';
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: usedModel, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Erro na API Groq');
      generatedText = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'nvidia') {
      usedModel = activeConfig.default_model || 'meta/llama-3.1-70b-instruct';
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: usedModel, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Erro na API NVIDIA');
      generatedText = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'openrouter') {
      usedModel = activeConfig.default_model || 'meta-llama/llama-3.3-70b-instruct:free';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: usedModel, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Erro na API OpenRouter');
      generatedText = data.choices?.[0]?.message?.content || '';
    }

    if (generatedText) {
      try {
        await supabaseAdmin.from('messages_log').insert({
          user_id: user.id,
          tipo_mensagem: messageType || 'personalizada',
          provedor_ia: provider,
          modelo: usedModel || 'padrao',
          mensagem_gerada: generatedText.trim()
        });
      } catch (logErr) {
        console.warn('Falha não-bloqueante ao registrar messages_log:', logErr);
      }
    }

    return res.status(200).json({ text: generatedText.trim(), provider, model: usedModel });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}