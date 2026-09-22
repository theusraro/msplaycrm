import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function isTransientError(status: number, message: string): boolean {
  if (status === 429 || status === 503 || status === 504 || status === 502) return true;
  const msg = (message || '').toLowerCase();
  return (
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('quota') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('try again later') ||
    msg.includes('unavailable') ||
    msg.includes('timeout')
  );
}

function sanitizeErrorMessage(msg: string, keysToHide: (string | undefined)[]): string {
  let clean = msg || '';
  for (const k of keysToHide) {
    if (k && k.length > 5) {
      clean = clean.split(k).join('***');
    }
  }
  return clean;
}

async function executeProviderCall(
  provider: string,
  model: string,
  apiKey: string,
  baseUrl: string | null | undefined,
  systemInstruction: string,
  userContent: string
): Promise<string> {
  if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction + "\n\n" + userContent }] }] })
    });
    const data = await response.json();
    if (data.error) {
      const err: any = new Error(data.error.message || 'Erro na API Gemini');
      err.status = response.status || data.error.code || 500;
      throw err;
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 1024, system: systemInstruction, messages: [{ role: 'user', content: userContent }] })
    });
    const data = await response.json();
    if (data.error) {
      const err: any = new Error(data.error.message || 'Erro na API Claude');
      err.status = response.status || 500;
      throw err;
    }
    return data.content?.[0]?.text || '';
  }

  if (provider === 'custom') {
    if (!baseUrl) throw new Error('Base URL não configurada para a IA Personalizada');
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
    });
    const data = await response.json();
    if (data.error) {
      const err: any = new Error(typeof data.error === 'string' ? data.error : data.error.message || 'Erro na API Custom');
      err.status = response.status || 500;
      throw err;
    }
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'groq') {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
    });
    const data = await response.json();
    if (data.error) {
      const err: any = new Error(typeof data.error === 'string' ? data.error : data.error.message || 'Erro na API Groq');
      err.status = response.status || 500;
      throw err;
    }
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'nvidia') {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
    });
    const data = await response.json();
    if (data.error) {
      const err: any = new Error(typeof data.error === 'string' ? data.error : data.error.message || 'Erro na API NVIDIA');
      err.status = response.status || 500;
      throw err;
    }
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'openrouter') {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
    });
    const data = await response.json();
    if (data.error) {
      const err: any = new Error(typeof data.error === 'string' ? data.error : data.error.message || 'Erro na API OpenRouter');
      err.status = response.status || 500;
      throw err;
    }
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error(`Provedor desconhecido: ${provider}`);
}

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
  let usedModel = activeConfig.default_model;
  if (provider === 'gemini' && !usedModel) usedModel = 'gemini-1.5-flash';
  if (provider === 'claude' && !usedModel) usedModel = 'claude-3-5-sonnet-20240620';
  if (provider === 'custom' && !usedModel) usedModel = 'gpt-4o';
  if (provider === 'groq' && !usedModel) usedModel = 'llama-3.3-70b-versatile';
  if (provider === 'nvidia' && !usedModel) usedModel = 'meta/llama-3.1-70b-instruct';
  if (provider === 'openrouter' && !usedModel) usedModel = 'meta-llama/llama-3.3-70b-instruct:free';

  let generatedText = '';
  const maxAttempts = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      generatedText = await executeProviderCall(
        provider,
        usedModel,
        AI_KEY,
        activeConfig.base_url,
        systemInstruction,
        userContent
      );
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      const transient = isTransientError(err.status || 0, err.message || '');
      if (attempt < maxAttempts && transient) {
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      break;
    }
  }

  if (lastError || !generatedText) {
    const isTransient = lastError ? isTransientError(lastError.status || 0, lastError.message || '') : false;
    if (isTransient) {
      return res.status(503).json({
        error: 'Modelo temporariamente sobrecarregado. Aguarde alguns segundos e tente novamente.',
        isTemporary: true
      });
    }

    const rawMessage = lastError?.message || 'Falha ao processar requisição com o modelo de IA.';
    const safeError = sanitizeErrorMessage(rawMessage, [AI_KEY, serviceRoleKey, supabaseAnonKey]);
    const statusCode = lastError?.status && lastError.status >= 400 && lastError.status < 600 ? lastError.status : 500;
    return res.status(statusCode).json({ error: safeError, isTemporary: false });
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
}