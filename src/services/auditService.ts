import { supabase } from '../lib/supabase';

export async function logAuditEvent(
  actionOrParams: string | { acao: string; entidade: string; entityId?: string; detalhes?: any },
  detailsOrUndefined?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let userNome = 'Sistema';
    let userEmail = user?.email || null;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, nome_completo, email')
        .eq('id', user.id)
        .single();
      if (profile) {
        userNome = profile.nome_completo || profile.nome || profile.email;
        userEmail = profile.email;
      }
    }

    let actionName = '';
    let entityName = 'crm';
    let entityId: string | null = null;
    let payloadDetails: any = {};

    if (typeof actionOrParams === 'string') {
      actionName = actionOrParams;
      payloadDetails = detailsOrUndefined || {};
    } else {
      actionName = actionOrParams.acao;
      entityName = actionOrParams.entidade || 'crm';
      entityId = actionOrParams.entityId || null;
      payloadDetails = actionOrParams.detalhes || {};
    }

    await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      user_nome: userNome,
      user_email: userEmail,
      action: actionName,
      acao: actionName,
      entidade: entityName,
      entity_id: entityId,
      details: payloadDetails,
      detalhes: payloadDetails,
    });
  } catch (err) {
    console.warn('Erro ao gravar log de auditoria:', err);
  }
}
