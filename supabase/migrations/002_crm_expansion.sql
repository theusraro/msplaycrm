-- MSPLAY CRM - Schema Expansion & Upgrades
-- Adds support for Sales, Creatives, Candidates, Audit Logs, Settings, and CRM metrics

-- 1. Extend profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome_completo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lead_quota INTEGER DEFAULT 20;

-- 2. Extend contact_assignments table
ALTER TABLE public.contact_assignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo';

-- 3. Extend contacts table
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo';

-- 4. Create Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    plano TEXT NOT NULL DEFAULT 'Mensal',
    metodo_pagamento TEXT NOT NULL DEFAULT 'pix',
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create Creatives Table
CREATE TABLE IF NOT EXISTS public.creatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    imagem_url TEXT NOT NULL,
    categoria TEXT DEFAULT 'Geral',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Create Candidates Table
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    cidade TEXT,
    estado TEXT,
    experiencia TEXT,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Create System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 10. Policies
CREATE POLICY "Admins full access sales" ON public.sales FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Resellers own sales" ON public.sales FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Resellers insert own sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone read active creatives" ON public.creatives FOR SELECT TO authenticated USING (ativo = true OR public.is_admin());
CREATE POLICY "Admins modify creatives" ON public.creatives FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Admins full access candidates" ON public.candidates FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins access system settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_admin());
