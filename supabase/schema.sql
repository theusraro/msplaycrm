-- MSPLAY CRM - Consolidated Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    ativo BOOLEAN NOT NULL DEFAULT true,
    whatsapp TEXT,
    status_admin TEXT NOT NULL DEFAULT 'ativo' CHECK (status_admin IN ('ativo', 'suspenso')),
    theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light')),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    origem TEXT DEFAULT 'Lista importada',
    observacoes TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    last_contact_at TIMESTAMPTZ,
    next_followup_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Contact Assignments
CREATE TABLE IF NOT EXISTS public.contact_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_contato', 'pendente', 'concluido', 'perdido')),
    notes TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contact_id, user_id)
);

-- 4. Sales
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.contact_assignments(id) ON DELETE SET NULL,
    valor NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'concluido' CHECK (status IN ('concluido', 'cancelado', 'reembolsado')),
    origem TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Creatives
CREATE TABLE IF NOT EXISTS public.creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    imagem_url TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Feed' CHECK (categoria IN ('Feed', 'Story', 'Status WhatsApp', 'Vídeo', 'Texto', 'Oferta')),
    recomendado BOOLEAN NOT NULL DEFAULT false,
    oferta_atual BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Message Logs
CREATE TABLE IF NOT EXISTS public.messages_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    tipo_mensagem TEXT NOT NULL,
    provedor_ia TEXT NOT NULL,
    modelo TEXT NOT NULL,
    mensagem_gerada TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    user_nome TEXT,
    acao TEXT NOT NULL,
    entidade TEXT NOT NULL,
    entity_id TEXT,
    detalhes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. API Settings
CREATE TABLE IF NOT EXISTS public.api_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL UNIQUE,
    api_key TEXT,
    base_url TEXT,
    default_model TEXT,
    system_prompt TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auth Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$$
BEGIN
    INSERT INTO public.profiles (id, email, nome, role, ativo, whatsapp)
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), 
        COALESCE(new.raw_user_meta_data->>'role', 'user'), 
        true,
        new.raw_user_meta_data->>'whatsapp'
    )
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email, 
        nome = EXCLUDED.nome;
    RETURN NEW;
END;
$$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND ativo = true
    );
$$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "Admins full access profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins full access contacts" ON public.contacts FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Resellers view assigned contacts" ON public.contacts FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contact_assignments WHERE contact_assignments.contact_id = contacts.id AND contact_assignments.user_id = auth.uid())
);
CREATE POLICY "Resellers update assigned contacts" ON public.contacts FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contact_assignments WHERE contact_assignments.contact_id = contacts.id AND contact_assignments.user_id = auth.uid())
);

CREATE POLICY "Admins full access assignments" ON public.contact_assignments FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Resellers view own assignments" ON public.contact_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Resellers update own assignments" ON public.contact_assignments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins full access sales" ON public.sales FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Resellers view own sales" ON public.sales FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Resellers insert own sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins full access creatives" ON public.creatives FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "All authenticated view creatives" ON public.creatives FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins full access message logs" ON public.messages_log FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Resellers view own message logs" ON public.messages_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Resellers insert own message logs" ON public.messages_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins full access audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins full access api settings" ON public.api_settings FOR ALL TO authenticated USING (public.is_admin());

