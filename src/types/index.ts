export type UserRole = 'admin' | 'user';

export type LeadStatus = 'novo' | 'em_contato' | 'pendente' | 'concluido' | 'perdido';

export type ResellerActivityStatus = 'ativo' | 'baixa_atividade' | 'inativo';

export type ResellerAdminStatus = 'ativo' | 'suspenso';

export type CreativeCategory = 'Feed' | 'Story' | 'Status WhatsApp' | 'Vídeo' | 'Texto' | 'Oferta';

export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  whatsapp?: string | null;
  status_admin?: ResellerAdminStatus;
  theme_preference?: 'dark' | 'light';
  last_activity_at?: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  nome: string;
  telefone: string;
  origem?: string;
  observacoes?: string;
  tags?: string[];
  last_contact_at?: string | null;
  next_followup_at?: string | null;
  created_by?: string;
  created_at: string;
  assignments?: ContactAssignment[];
}

export interface ContactAssignment {
  id: string;
  contact_id: string;
  user_id: string;
  status: LeadStatus;
  notes?: string | null;
  assigned_at: string;
  updated_at?: string;
  contacts?: Contact;
  profiles?: Profile;
}

export interface Sale {
  id: string;
  contact_id: string;
  user_id: string;
  assignment_id?: string | null;
  valor: number;
  status: 'concluido' | 'cancelado' | 'reembolsado';
  origem?: string;
  observacoes?: string | null;
  created_at: string;
  contacts?: Contact;
  profiles?: Profile;
}

export interface Creative {
  id: string;
  titulo: string;
  descricao?: string | null;
  imagem_url: string;
  categoria: CreativeCategory;
  recomendado: boolean;
  oferta_atual: boolean;
  created_by?: string;
  created_at: string;
}

export interface MessageLog {
  id: string;
  user_id: string;
  contact_id?: string | null;
  tipo_mensagem: string;
  provedor_ia: string;
  modelo: string;
  mensagem_gerada: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  user_nome?: string | null;
  acao: string;
  entidade: string;
  entity_id?: string | null;
  detalhes?: any;
  created_at: string;
}

export interface ApiSetting {
  id?: string;
  provider: string;
  api_key?: string;
  base_url?: string;
  default_model?: string;
  system_prompt?: string;
  updated_at?: string;
}

export interface ResellerStats {
  profile: Profile;
  activityStatus: ResellerActivityStatus;
  adminStatus: ResellerAdminStatus;
  leadsReceived: number;
  leadsWorked: number;
  leadsPending: number;
  salesCount: number;
  salesValue: number;
  conversionRate: number;
  lastActivity: string | null;
}

