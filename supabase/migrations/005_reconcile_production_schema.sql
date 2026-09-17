-- ==============================================================================
-- MSPLAY CRM - RECONCILIAÇÃO COMPLETA E IDEMPOTENTE DO BANCO DE DADOS (SUPABASE)
-- Migration: 005_reconcile_production_schema.sql (Versão Auditada Tabela por Tabela)
-- 
-- PRINCÍPIOS FUNDAMENTAIS DESTA MIGRATION:
-- 1. Toda coluna utilizada pelo código possui 'ALTER TABLE ... ADD COLUMN IF NOT EXISTS'.
--    (Isso previne falhas caso a tabela já exista sem colunas novas criadas posteriormente).
-- 2. Tratamento e higienização prévia de registros legados antes da aplicação de CHECK constraints.
-- 3. handle_new_user() transparente (sem supressão de erros estruturais).
-- 4. Proteção estrita de colunas administrativas em profiles via Trigger BEFORE UPDATE.
-- 5. RLS 100% ativo e calibrado para Admin vs Revendedor.
-- 6. Totalmente não-destrutiva e idempotente (sem DROP TABLE / TRUNCATE / DELETE de dados).
-- ==============================================================================

-- 0. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA: PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nome TEXT,
    nome_completo TEXT,
    telefone TEXT,
    whatsapp TEXT,
    role TEXT NOT NULL DEFAULT 'reseller',
    ativo BOOLEAN NOT NULL DEFAULT true,
    status TEXT DEFAULT 'active',
    status_admin TEXT DEFAULT 'ativo',
    lead_quota INTEGER DEFAULT 20,
    theme_preference TEXT DEFAULT 'dark',
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir explicitamente TODAS as colunas utilizadas no código
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome_completo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'reseller';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_admin TEXT DEFAULT 'ativo';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lead_quota INTEGER DEFAULT 20;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Higienização e sincronização de registros legados existentes
UPDATE public.profiles SET email = auth_users.email FROM auth.users AS auth_users WHERE public.profiles.id = auth_users.id AND public.profiles.email IS NULL;
UPDATE public.profiles SET nome = nome_completo WHERE (nome IS NULL OR nome = '') AND nome_completo IS NOT NULL;
UPDATE public.profiles SET nome_completo = nome WHERE (nome_completo IS NULL OR nome_completo = '') AND nome IS NOT NULL;
UPDATE public.profiles SET whatsapp = telefone WHERE (whatsapp IS NULL OR whatsapp = '') AND telefone IS NOT NULL;
UPDATE public.profiles SET telefone = whatsapp WHERE (telefone IS NULL OR telefone = '') AND whatsapp IS NOT NULL;
UPDATE public.profiles SET role = 'reseller' WHERE role IS NULL OR role NOT IN ('admin', 'reseller', 'user');
UPDATE public.profiles SET status = 'active' WHERE status IS NULL OR status NOT IN ('active', 'moderate', 'inactive', 'ativo', 'suspenso');
UPDATE public.profiles SET status_admin = 'ativo' WHERE status_admin IS NULL OR status_admin NOT IN ('ativo', 'suspenso');
UPDATE public.profiles SET ativo = true WHERE ativo IS NULL;
UPDATE public.profiles SET lead_quota = 20 WHERE lead_quota IS NULL;
UPDATE public.profiles SET theme_preference = 'dark' WHERE theme_preference IS NULL OR theme_preference NOT IN ('dark', 'light');

-- Aplicar CHECK constraints após higienização
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'reseller', 'user'));
END $$;

DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'moderate', 'inactive', 'ativo', 'suspenso'));
END $$;

DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_theme_preference_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_theme_preference_check CHECK (theme_preference IN ('dark', 'light'));
END $$;

-- ==============================================================================
-- 2. TABELA: CONTACTS (LEADS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT,
    telefone TEXT,
    observacoes TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    origem TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'novo',
    last_contact_at TIMESTAMPTZ,
    next_followup_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir explicitamente TODAS as colunas utilizadas no código
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS next_followup_at TIMESTAMPTZ;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Higienização
UPDATE public.contacts SET status = 'novo' WHERE status IS NULL;
UPDATE public.contacts SET origem = 'manual' WHERE origem IS NULL;
UPDATE public.contacts SET tags = ARRAY[]::TEXT[] WHERE tags IS NULL;

-- ==============================================================================
-- 3. TABELA: CONTACT_ASSIGNMENTS (ATRIBUIÇÕES DE LEADS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.contact_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'novo',
    notes TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact_id, user_id)
);

-- Garantir explicitamente TODAS as colunas utilizadas no código
ALTER TABLE public.contact_assignments ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.contact_assignments ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.contact_assignments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.contact_assignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo';
ALTER TABLE public.contact_assignments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.contact_assignments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.contact_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Higienização
UPDATE public.contact_assignments SET status = 'novo' WHERE status IS NULL OR status NOT IN ('novo', 'em_contato', 'pendente', 'concluido', 'perdido');
UPDATE public.contact_assignments SET assigned_at = NOW() WHERE assigned_at IS NULL;

-- ==============================================================================
-- 4. TABELA: SALES (VENDAS / TRANSAÇÕES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES public.contact_assignments(id) ON DELETE SET NULL,
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    plano TEXT NOT NULL DEFAULT 'Mensal',
    metodo_pagamento TEXT NOT NULL DEFAULT 'pix',
    status TEXT NOT NULL DEFAULT 'concluido',
    origem TEXT DEFAULT 'crm',
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir explicitamente TODAS as colunas utilizadas no código
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.contact_assignments(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS valor NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'Mensal';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'pix';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'concluido';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'crm';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Higienização
UPDATE public.sales SET valor = 0.00 WHERE valor IS NULL;
UPDATE public.sales SET plano = 'Mensal' WHERE plano IS NULL;
UPDATE public.sales SET metodo_pagamento = 'pix' WHERE metodo_pagamento IS NULL;
UPDATE public.sales SET status = 'concluido' WHERE status IS NULL;
UPDATE public.sales SET origem = 'crm' WHERE origem IS NULL;

-- ==============================================================================
-- 5. TABELA: CREATIVES (CRIATIVOS & POSTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    imagem_url TEXT NOT NULL,
    categoria TEXT DEFAULT 'Geral',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    recomendado BOOLEAN DEFAULT false,
    oferta_atual BOOLEAN DEFAULT false,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir explicitamente TODAS as colunas utilizadas no código (inclusive 'ativo')
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS imagem_url TEXT;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral';
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS recomendado BOOLEAN DEFAULT false;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS oferta_atual BOOLEAN DEFAULT false;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.creatives ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Higienização
UPDATE public.creatives SET ativo = true WHERE ativo IS NULL;
UPDATE public.creatives SET categoria = 'Geral' WHERE categoria IS NULL;
UPDATE public.creatives SET tags = ARRAY[]::TEXT[] WHERE tags IS NULL;
UPDATE public.creatives SET recomendado = false WHERE recomendado IS NULL;
UPDATE public.creatives SET oferta_atual = false WHERE oferta_atual IS NULL;

-- ==============================================================================
-- 6. TABELA: CANDIDATES (CANDIDATOS A REVENDEDOR)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    cidade TEXT,
    estado TEXT,
    experiencia TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir explicitamente TODAS as colunas utilizadas no código
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS experiencia TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Higienização
UPDATE public.candidates SET status = 'pendente' WHERE status IS NULL OR status NOT IN ('pendente', 'aprovado', 'rejeitado');

-- ==============================================================================
-- 7. TABELA: AUDIT_LOGS (TRILHA DE AUDITORIA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    user_nome TEXT,
    action TEXT NOT NULL,
    acao TEXT,
    entidade TEXT DEFAULT 'crm',
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    detalhes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir explicitamente TODAS as colunas utilizadas no código
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_nome TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS acao TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entidade TEXT DEFAULT 'crm';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS detalhes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Higienização
UPDATE public.audit_logs SET action = COALESCE(action, acao, 'system_event') WHERE action IS NULL;
UPDATE public.audit_logs SET acao = COALESCE(acao, action, 'system_event') WHERE acao IS NULL;
UPDATE public.audit_logs SET details = COALESCE(details, detalhes, '{}'::jsonb) WHERE details IS NULL;
UPDATE public.audit_logs SET detalhes = COALESCE(detalhes, details, '{}'::jsonb) WHERE detalhes IS NULL;

-- ==============================================================================
-- 8. TABELA: SYSTEM_SETTINGS (CONFIGURAÇÕES GERAIS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS value JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 9. TABELA: API_SETTINGS (CHAVES E PROVEDORES DE IA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.api_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL UNIQUE,
    api_key TEXT,
    base_url TEXT,
    default_model TEXT,
    system_prompt TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.api_settings ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.api_settings ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.api_settings ADD COLUMN IF NOT EXISTS api_key TEXT;
ALTER TABLE public.api_settings ADD COLUMN IF NOT EXISTS base_url TEXT;
ALTER TABLE public.api_settings ADD COLUMN IF NOT EXISTS default_model TEXT;
ALTER TABLE public.api_settings ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE public.api_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 10. TABELA: MESSAGES_LOG (DISPAROS DE IA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    tipo_mensagem TEXT NOT NULL,
    provedor_ia TEXT NOT NULL,
    modelo TEXT NOT NULL,
    mensagem_gerada TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS tipo_mensagem TEXT;
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS provedor_ia TEXT;
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS modelo TEXT;
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS mensagem_gerada TEXT;
ALTER TABLE public.messages_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 11. FUNÇÃO AUXILIAR: IS_ADMIN
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role = 'admin' 
          AND ativo = true
    );
$$;

-- ==============================================================================
-- 12. FUNÇÃO E TRIGGER DE NOVO USUÁRIO (AUTH.USERS -> PROFILES)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_nome TEXT;
    v_role TEXT;
    v_is_first_user BOOLEAN;
BEGIN
    -- 1. Extração segura do nome (com fallback para parte local do email)
    v_nome := COALESCE(
        NULLIF(TRIM(new.raw_user_meta_data->>'nome_completo'), ''),
        NULLIF(TRIM(new.raw_user_meta_data->>'nome'), ''),
        NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
        split_part(new.email, '@', 1)
    );

    -- 2. Verificação se é o primeiro usuário do sistema (bootstrap de admin)
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO v_is_first_user;

    IF v_is_first_user THEN
        v_role := 'admin';
    ELSE
        -- Por padrão, novos cadastros são revendedores
        v_role := 'reseller';
        -- Somente aceita admin se vier explicitamente via app_metadata (Service Role / Auth Admin)
        IF new.raw_app_meta_data->>'role' = 'admin' THEN
            v_role := 'admin';
        END IF;
    END IF;

    -- 3. Inserção garantida no profile (cota de leads sempre padronizada em 20)
    INSERT INTO public.profiles (
        id,
        email,
        nome,
        nome_completo,
        telefone,
        whatsapp,
        role,
        ativo,
        status,
        status_admin,
        lead_quota,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        v_nome,
        v_nome,
        COALESCE(new.raw_user_meta_data->>'telefone', new.raw_user_meta_data->>'whatsapp', NULL),
        COALESCE(new.raw_user_meta_data->>'whatsapp', new.raw_user_meta_data->>'telefone', NULL),
        v_role,
        true,
        'active',
        'ativo',
        20,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nome = COALESCE(NULLIF(EXCLUDED.nome, ''), public.profiles.nome),
        nome_completo = COALESCE(NULLIF(EXCLUDED.nome_completo, ''), public.profiles.nome_completo),
        telefone = COALESCE(EXCLUDED.telefone, public.profiles.telefone),
        whatsapp = COALESCE(EXCLUDED.whatsapp, public.profiles.whatsapp),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 13. PROTEÇÃO DE COLUNAS ADMINISTRATIVAS EM PROFILES (TRIGGER BEFORE UPDATE)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_administrative_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Acesso negado: você não tem permissão para alterar sua função (role).';
        END IF;
        IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
            RAISE EXCEPTION 'Acesso negado: você não tem permissão para alterar o status ativo.';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Acesso negado: você não tem permissão para alterar o status da conta.';
        END IF;
        IF NEW.status_admin IS DISTINCT FROM OLD.status_admin THEN
            RAISE EXCEPTION 'Acesso negado: você não tem permissão para alterar o status administrativo.';
        END IF;
        IF NEW.lead_quota IS DISTINCT FROM OLD.lead_quota THEN
            RAISE EXCEPTION 'Acesso negado: você não tem permissão para alterar sua cota de leads.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_profile_admin_fields ON public.profiles;
CREATE TRIGGER trigger_protect_profile_admin_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_administrative_fields();

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) - POLICIES RECONCILIADAS
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_log ENABLE ROW LEVEL SECURITY;

-- 14.1 PROFILES POLICIES
DROP POLICY IF EXISTS "Admins all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile non-sensitive" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Admins all profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Users own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 14.2 CONTACTS (LEADS) POLICIES
DROP POLICY IF EXISTS "Admins all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users assigned contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users insert own created contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users update assigned contacts" ON public.contacts;
DROP POLICY IF EXISTS "Resellers insert own contacts" ON public.contacts;

CREATE POLICY "Admins all contacts" ON public.contacts
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Users assigned contacts" ON public.contacts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.contact_assignments 
            WHERE contact_assignments.contact_id = contacts.id 
              AND contact_assignments.user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

CREATE POLICY "Resellers insert own contacts" ON public.contacts
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users update assigned contacts" ON public.contacts
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.contact_assignments 
            WHERE contact_assignments.contact_id = contacts.id 
              AND contact_assignments.user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

-- 14.3 CONTACT_ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Admins all assignments" ON public.contact_assignments;
DROP POLICY IF EXISTS "Users own assignments" ON public.contact_assignments;
DROP POLICY IF EXISTS "Users update own assignment status" ON public.contact_assignments;

CREATE POLICY "Admins all assignments" ON public.contact_assignments
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Users own assignments" ON public.contact_assignments
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users update own assignment status" ON public.contact_assignments
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 14.4 SALES POLICIES
DROP POLICY IF EXISTS "Admins full access sales" ON public.sales;
DROP POLICY IF EXISTS "Resellers own sales" ON public.sales;
DROP POLICY IF EXISTS "Resellers insert own sales" ON public.sales;

CREATE POLICY "Admins full access sales" ON public.sales
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Resellers own sales" ON public.sales
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Resellers insert own sales" ON public.sales
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 14.5 CREATIVES POLICIES
DROP POLICY IF EXISTS "Anyone read active creatives" ON public.creatives;
DROP POLICY IF EXISTS "Admins modify creatives" ON public.creatives;

CREATE POLICY "Anyone read active creatives" ON public.creatives
    FOR SELECT TO authenticated
    USING (ativo = true OR public.is_admin());

CREATE POLICY "Admins modify creatives" ON public.creatives
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 14.6 CANDIDATES POLICIES
DROP POLICY IF EXISTS "Admins full access candidates" ON public.candidates;
DROP POLICY IF EXISTS "Public insert candidates" ON public.candidates;

CREATE POLICY "Admins full access candidates" ON public.candidates
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Public insert candidates" ON public.candidates
    FOR INSERT TO anon, authenticated
    WITH CHECK (status = 'pendente');

-- 14.7 AUDIT_LOGS POLICIES
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated insert own audit logs" ON public.audit_logs;

CREATE POLICY "Admins read audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin());

CREATE POLICY "Authenticated insert own audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 14.8 SYSTEM_SETTINGS POLICIES
DROP POLICY IF EXISTS "Admins access system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Resellers read system settings" ON public.system_settings;

CREATE POLICY "Admins access system settings" ON public.system_settings
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Resellers read system settings" ON public.system_settings
    FOR SELECT TO authenticated
    USING (true);

-- 14.9 API_SETTINGS POLICIES
DROP POLICY IF EXISTS "Admins access api settings" ON public.api_settings;

CREATE POLICY "Admins access api settings" ON public.api_settings
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 14.10 MESSAGES_LOG POLICIES
DROP POLICY IF EXISTS "Admins all logs" ON public.messages_log;
DROP POLICY IF EXISTS "Users own logs" ON public.messages_log;
DROP POLICY IF EXISTS "Users insert own logs" ON public.messages_log;

CREATE POLICY "Admins all logs" ON public.messages_log
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Users own logs" ON public.messages_log
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users insert own logs" ON public.messages_log
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- 15. SUPABASE STORAGE (BUCKET 'CREATIVES')
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('creatives', 'creatives', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public and Resellers read creatives storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins insert creatives storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins update creatives storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete creatives storage" ON storage.objects;

CREATE POLICY "Public and Resellers read creatives storage" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'creatives');

CREATE POLICY "Admins insert creatives storage" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'creatives' AND public.is_admin());

CREATE POLICY "Admins update creatives storage" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'creatives' AND public.is_admin())
    WITH CHECK (bucket_id = 'creatives' AND public.is_admin());

CREATE POLICY "Admins delete creatives storage" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'creatives' AND public.is_admin());

-- ==============================================================================
-- 16. ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contact_assignments_user_id ON public.contact_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_assignments_contact_id ON public.contact_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_assignments_status ON public.contact_assignments(status);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_creatives_ativo ON public.creatives(ativo);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_log_user_id ON public.messages_log(user_id);

-- ==============================================================================
-- FIM DA MIGRATION DE RECONCILIAÇÃO
-- ==============================================================================
