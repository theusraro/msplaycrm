export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  theme_preference: 'dark' | 'light';
  created_at: string;
}

export interface Contact {
  id: string;
  nome: string;
  telefone: string;
  observacoes?: string;
  tags?: string[];
  created_by?: string;
  created_at: string;
  assignments?: { user_id: string; user?: Profile }[];
}

export interface MessageLog {
  id: string;
  user_id: string;
  contact_id?: string;
  tipo_mensagem: string;
  provedor_ia: string;
  modelo: string;
  mensagem_gerada: string;
  created_at: string;
}

export interface AppConfig {
  system_prompt: string;
  default_model: string;
  default_provider: 'groq' | 'nvidia' | 'openrouter';
}