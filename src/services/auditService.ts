import { supabase } from '../lib/supabase';

export async function logAuditEvent(params: {
  acao: string;
  entidade: string;
  entityId?: string;
  detalhes?: any;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let userNome = 'Sistema';
    let userEmail = user?.email || null;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, email')
        .eq('id', user.id)
        .single();
      if (profile) {
        userNome = profile.nome;
        userEmail = profile.email;
      }
    }

    await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      user_nome: userNome,
      user_email: userEmail,
      acao: params.acao,
      entidade: params.entidade,
      entity_id: params.entityId || null,
      detalhes: params.detalhes || null,
    });
  } catch (err) {
    console.warn('Erro ao gravar log de auditoria:', err);
  }
}

