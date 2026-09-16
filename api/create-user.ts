import { createClient } from '@supabase/supabase-js';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

  const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey);
  const token = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '';
  const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser(token);

  if (authError || !user) return res.status(401).json({ error: 'Sessão inválida' });

  // Verificar se o usuário autenticado é admin
  const { data: profile, error: profileErr } = await supabaseUserClient
    .from('profiles')
    .select('role, ativo')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile || profile.role !== 'admin' || !profile.ativo) {
    return res.status(403).json({ error: 'Acesso negado: apenas administradores podem criar usuários' });
  }

  const { email, password, nome, role = 'user', whatsapp = '' } = req.body || {};

  if (!email || !password || !nome) {
    return res.status(400).json({ error: 'Campos obrigatórios: email, password, nome' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, role, whatsapp }
  });

  if (createError) {
    return res.status(400).json({ error: createError.message });
  }

  if (newUser.user) {
    // Garantir registro no profiles
    await supabaseAdmin.from('profiles').upsert({
      id: newUser.user.id,
      email,
      nome,
      role,
      ativo: true,
      whatsapp: whatsapp || null
    });
  }

  return res.status(200).json({ success: true, user: { id: newUser.user?.id, email, nome, role } });
}

