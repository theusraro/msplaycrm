CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    ativo BOOLEAN NOT NULL DEFAULT true,
    theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    observacoes TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.contact_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contact_id, user_id)
);

CREATE TABLE public.messages_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    tipo_mensagem TEXT NOT NULL,
    provedor_ia TEXT NOT NULL,
    modelo TEXT NOT NULL,
    mensagem_gerada TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nome, role, ativo)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), COALESCE(new.raw_user_meta_data->>'role', 'user'), true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND ativo = true);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Admins all profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins all contacts" ON public.contacts FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users assigned contacts" ON public.contacts FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contact_assignments WHERE contact_assignments.contact_id = contacts.id AND contact_assignments.user_id = auth.uid())
);

CREATE POLICY "Admins all assignments" ON public.contact_assignments FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users own assignments" ON public.contact_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins all logs" ON public.messages_log FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users own logs" ON public.messages_log FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
