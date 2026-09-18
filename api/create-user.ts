import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Supabase credentials not configured on server' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { email, password, nome_completo, telefone, lead_quota = 20, role = 'reseller' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    // 1. Create auth user with service role
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome: nome_completo,
        nome_completo,
        telefone,
        whatsapp: telefone,
        role: role === 'admin' ? 'reseller' : role // Security: avoid admin creation via public endpoint
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = userData.user.id;

    // 2. Upsert profile with full field compatibility
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      nome: nome_completo,
      nome_completo,
      telefone,
      whatsapp: telefone,
      role: role === 'admin' ? 'reseller' : role,
      admin_status: 'ativo',
      lead_quota: Number(lead_quota) || 20,
      ativo: true,
      updated_at: new Date().toISOString()
    });

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: userId,
        email,
        nome_completo
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro interno ao criar usuário' });
  }
}
