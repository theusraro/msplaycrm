-- 002_crm_expansion.sql: Non-destructive expansion for MSPLAY CRM Professional
-- 1. Contact Assignments Status & Updated Timestamp
DO $$$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contact_assignments' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.contact_assignments 
        ADD COLUMN status TEXT NOT NULL DEFAULT 'novo' 
        CHECK (status IN ('novo', 'em_contato', 'pendente', 'concluido', 'perdido'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contact_assignments' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.contact_assignments 
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contact_assignments' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.contact_assignments 
        ADD COLUMN notes TEXT;
    END IF;
END $$$;

-- 2. Contacts Enrichment (Origem, Follow-ups)
DO $$$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'origem'
    ) THEN
        ALTER TABLE public.contacts 
        ADD COLUMN origem TEXT DEFAULT 'Lista importada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'last_contact_at'
    ) THEN
        ALTER TABLE public.contacts 
        ADD COLUMN last_contact_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contacts' 
        AND column_name = 'next_followup_at'
    ) THEN
        ALTER TABLE public.contacts 
        ADD COLUMN next_followup_at TIMESTAMPTZ;
    END IF;
END $$$;

-- 3. Profiles Enrichment (WhatsApp, Administrative Status, Activity)
DO $$$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN whatsapp TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'status_admin'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN status_admin TEXT NOT NULL DEFAULT 'ativo' 
        CHECK (status_admin IN ('ativo', 'suspenso'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$$;

-- 4. Sales Table
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

-- 5. Creatives Table
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

-- 6. Audit Logs Table
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

-- 7. API Settings Table
CREATE TABLE IF NOT EXISTS public.api_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL UNIQUE,
    api_key TEXT,
    base_url TEXT,
    default_model TEXT,
    system_prompt TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_contact_assignments_user_status ON public.contact_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_contact_assignments_status ON public.contact_assignments(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_followup ON public.contacts(next_followup_at);
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON public.sales(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

