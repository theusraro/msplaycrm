import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sessão inválida' });

  const { prompt, contactName, contactNotes, messageType, provider = 'groq', model, customInstructions, resellerPhone } = req.body;

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  );

  const { data: keyData } = await supabaseAdmin.from('api_settings').select('*').eq('provider', provider).single();
  const AI_KEY = keyData?.api_key || process.env[`${provider.toUpperCase()}_API_KEY`];

  if (!AI_KEY) {
    return res.status(500).json({ error: `Chave de API não configurada para: ${provider}. Configure no Painel Admin.` });
  }

  // Mapeamento dos novos objetivos de venda solicitados
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

  const systemInstruction = `Você é o assistente virtual de vendas de alta conversão da MSPLAY (serviço premium de streaming).
Sua missão é gerar uma mensagem persuasiva para o WhatsApp.
Regras:
- Objetivo da Abordagem: ${objectivePrompt}
- Cliente: ${contactName || 'Cliente'}. Informações: ${contactNotes || 'Nenhuma'}.
- Contato do Revendedor para atendimento/PIX: ${resellerPhone || 'Falar no chat'}.
- Use emojis com moderação. Retorne APENAS a mensagem pronta para envio.`;

  const userContent = prompt || `${customInstructions ? `Instruções extras: ${customInstructions}` : ''}`;
  let generatedText = '';
  let usedModel = model;

  try {
    if (provider === 'gemini') {
      usedModel = model || keyData?.default_model || 'gemini-1.5-pro';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${usedModel}:generateContent?key=${AI_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemInstruction + "\n\n" + userContent }] }] })
      });
      const data = await response.json();
      if(data.error) throw new Error(data.error.message);
      generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'claude') {
      usedModel = model || keyData?.default_model || 'claude-3-5-sonnet-20240620';
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: usedModel, max_tokens: 1024, system: systemInstruction, messages: [{ role: 'user', content: userContent }] })
      });
      const data = await response.json();
      if(data.error) throw new Error(data.error.message);
      generatedText = data.content?.[0]?.text || '';
    } else if (provider === 'custom') {
      usedModel = model || keyData?.default_model || 'gpt-4o';
      if (!keyData?.base_url) throw new Error('Base URL não configurada');
      const response = await fetch(keyData.base_url, {
        method: 'POST', headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: usedModel, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
      });
      const data = await response.json();
      if(data.error) throw new Error(data.error.message);
      generatedText = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'groq') {
      usedModel = model || 'llama-3.3-70b-versatile';
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: usedModel, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
      });
      const data = await response.json();
      generatedText = data.choices[0]?.message?.content || '';
    } else if (provider === 'nvidia') {
      usedModel = model || 'meta/llama-3.1-70b-instruct';
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST', headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: usedModel, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
      });
      const data = await response.json();
      generatedText = data.choices[0]?.message?.content || '';
    } else if (provider === 'openrouter') {
      usedModel = model || 'meta-llama/llama-3.3-70b-instruct:free';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Authorization': `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: usedModel, messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: userContent }] })
      });
      const data = await response.json();
      generatedText = data.choices[0]?.message?.content || '';
    }

    if (generatedText) {
      await supabase.from('messages_log').insert({
        user_id: user.id, tipo_mensagem: messageType || 'personalizada', provedor_ia: provider, modelo: usedModel, mensagem_gerada: generatedText
      });
    }
    return res.status(200).json({ text: generatedText.trim(), provider, model: usedModel });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}