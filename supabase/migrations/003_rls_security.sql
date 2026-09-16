-- 003_rls_security.sql: Robust Row Level Security for MSPLAY CRM

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Helper function for Admin check
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND ativo = true
    );
$$$ LANGUAGE sql SECURITY DEFINER;

-- Drop existing policies if any to ensure clean apply
DO $$$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$$;

-- 1. PROFILES POLICIES
CREATE POLICY "Admins full access profiles" ON public.profiles 
    FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users view own profile" ON public.profiles 
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles 
    FOR UPDATE TO authenticated USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- 2. CONTACTS POLICIES
CREATE POLICY "Admins full access contacts" ON public.contacts 
    FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Resellers view assigned contacts" ON public.contacts 
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.contact_assignments 
            WHERE contact_assignments.contact_id = contacts.id 
            AND contact_assignments.user_id = auth.uid()
        )
    );

CREATE POLICY "Resellers update assigned contacts" ON public.contacts 
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.contact_assignments 
            WHERE contact_assignments.contact_id = contacts.id 
            AND contact_assignments.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contact_assignments 
            WHERE contact_assignments.contact_id = contacts.id 
            AND contact_assignments.user_id = auth.uid()
        )
    );

-- 3. CONTACT ASSIGNMENTS POLICIES
CREATE POLICY "Admins full access assignments" ON public.contact_assignments 
    FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Resellers view own assignments" ON public.contact_assignments 
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Resellers update own assignments" ON public.contact_assignments 
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) 
    WITH CHECK (user_id = auth.uid());

-- 4. SALES POLICIES
CREATE POLICY "Admins full access sales" ON public.sales 
    FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Resellers view own sales" ON public.sales 
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Resellers insert own sales" ON public.sales 
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 5. CREATIVES POLICIES
CREATE POLICY "Admins full access creatives" ON public.creatives 
    FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "All authenticated view creatives" ON public.creatives 
    FOR SELECT TO authenticated USING (true);

-- 6. MESSAGES LOG POLICIES
CREATE POLICY "Admins full access message logs" ON public.messages_log 
    FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Resellers view own message logs" ON public.messages_log 
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Resellers insert own message logs" ON public.messages_log 
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 7. AUDIT LOGS POLICIES
CREATE POLICY "Admins full access audit logs" ON public.audit_logs 
    FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs 
    FOR INSERT TO authenticated WITH CHECK (true);

-- 8. API SETTINGS POLICIES (Admin Only)
CREATE POLICY "Admins full access api settings" ON public.api_settings 
    FOR ALL TO authenticated USING (public.is_admin());

