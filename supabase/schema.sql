-- ==============================================================================
-- MSPLAY CRM - CONSOLIDATED DATABASE SCHEMA (SUPABASE)
-- Target: PostgreSQL with Supabase Auth, Storage and RLS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nome TEXT,
    nome_completo TEXT,
    telefone TEXT,
    whatsapp TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'reseller', 'user')) DEFAULT 'reseller',
    ativo BOOLEAN NOT NULL DEFAULT true,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'moderate', 'inactive', 'ativo', 'suspenso')),
    status_admin TEXT DEFAULT 'ativo' CHECK (status_admin IN ('ativo', 'suspenso')),
    lead_quota INTEGER DEFAULT 20,
    theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light')),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONTACTS (LEADS)
CREATE TABLE public.contacts (
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

-- 3. CONTACT_ASSIGNMENTS
CREATE TABLE public.contact_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_contato', 'pendente', 'concluido', 'perdido')),
    notes TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact_id, user_id)
);

-- 4. SALES
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES public.contact_assignments(id) ON DELETE SET NULL,
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    plano TEXT NOT NULL DEFAULT 'Mensal',
    metodo_pagamento TEXT NOT NULL DEFAULT 'pix',
    status TEXT NOT NULL DEFAULT 'concluido' CHECK (status IN ('concluido', 'cancelado', 'reembolsado')),
    origem TEXT DEFAULT 'crm',
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CREATIVES
CREATE TABLE public.creatives (
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

-- 6. CANDIDATES
CREATE TABLE public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    cidade TEXT,
    estado TEXT,
    experiencia TEXT,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. AUDIT_LOGS
CREATE TABLE public.audit_logs (
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

-- 8. SYSTEM_SETTINGS
CREATE TABLE public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. API_SETTINGS
CREATE TABLE public.api_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL UNIQUE,
    api_key TEXT,
    base_url TEXT,
    default_model TEXT,
    system_prompt TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. MESSAGES_LOG
CREATE TABLE public.messages_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    tipo_mensagem TEXT NOT NULL,
    provedor_ia TEXT NOT NULL,
    modelo TEXT NOT NULL,
    mensagem_gerada TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- FUNCTIONS & TRIGGERS
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
    v_nome := COALESCE(
        NULLIF(TRIM(new.raw_user_meta_data->>'nome_completo'), ''),
        NULLIF(TRIM(new.raw_user_meta_data->>'nome'), ''),
        NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
        split_part(new.email, '@', 1)
    );

    SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO v_is_first_user;

    IF v_is_first_user THEN
        v_role := 'admin';
    ELSE
        v_role := 'reseller';
        IF new.raw_app_meta_data->>'role' = 'admin' THEN
            v_role := 'admin';
        END IF;
    END IF;

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
-- ROW LEVEL SECURITY (RLS)
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

-- Profiles
CREATE POLICY "Admins all profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Contacts
CREATE POLICY "Admins all contacts" ON public.contacts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users assigned contacts" ON public.contacts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.contact_assignments WHERE contact_assignments.contact_id = contacts.id AND contact_assignments.user_id = auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Resellers insert own contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users update assigned contacts" ON public.contacts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.contact_assignments WHERE contact_assignments.contact_id = contacts.id AND contact_assignments.user_id = auth.uid()) OR created_by = auth.uid());

-- Contact Assignments
CREATE POLICY "Admins all assignments" ON public.contact_assignments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users own assignments" ON public.contact_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own assignment status" ON public.contact_assignments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Sales
CREATE POLICY "Admins full access sales" ON public.sales FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Resellers own sales" ON public.sales FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Resellers insert own sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Creatives
CREATE POLICY "Anyone read active creatives" ON public.creatives FOR SELECT TO authenticated USING (ativo = true OR public.is_admin());
CREATE POLICY "Admins modify creatives" ON public.creatives FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Candidates
CREATE POLICY "Admins full access candidates" ON public.candidates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Public insert candidates" ON public.candidates FOR INSERT TO anon, authenticated WITH CHECK (status = 'pendente');

-- Audit Logs
CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Authenticated insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- System Settings
CREATE POLICY "Admins access system settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Resellers read system settings" ON public.system_settings FOR SELECT TO authenticated USING (true);

-- API Settings
CREATE POLICY "Admins access api settings" ON public.api_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Messages Log
CREATE POLICY "Admins all logs" ON public.messages_log FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users own logs" ON public.messages_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own logs" ON public.messages_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Storage Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('creatives', 'creatives', true) ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public and Resellers read creatives storage" ON storage.objects FOR SELECT USING (bucket_id = 'creatives');
CREATE POLICY "Admins insert creatives storage" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'creatives' AND public.is_admin());
CREATE POLICY "Admins update creatives storage" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'creatives' AND public.is_admin()) WITH CHECK (bucket_id = 'creatives' AND public.is_admin());
CREATE POLICY "Admins delete creatives storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'creatives' AND public.is_admin());
