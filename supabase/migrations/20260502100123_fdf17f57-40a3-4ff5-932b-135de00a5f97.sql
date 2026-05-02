-- Step 1: Fix Schema for Enterprise Support
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by UUID;

-- Step 2: Ensure Master Company exists
INSERT INTO public.companies (id, name, is_master, is_system_owner)
VALUES (gen_random_uuid(), 'NAVANHULA CLOUD MASTER', true, true)
ON CONFLICT DO NOTHING;

-- Step 3: Setup CEO Profile
DO $$
DECLARE
    v_master_company_id UUID;
    v_ceo_id UUID;
BEGIN
    SELECT id INTO v_master_company_id FROM public.companies WHERE is_master = true LIMIT 1;
    
    -- Update CEO Profile if it exists
    UPDATE public.profiles
    SET 
      is_super_admin = true,
      company_id = v_master_company_id,
      status = 'active'
    WHERE email = 'agrovidanavanhulalda@gmail.com'
    RETURNING id INTO v_ceo_id;

    -- Update role in user_roles table if it exists
    IF v_ceo_id IS NOT NULL AND EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        DELETE FROM public.user_roles WHERE user_id = v_ceo_id;
        -- Assuming 'CEO' is a valid value for the user-defined 'role' type
        -- If it fails, we might need to cast or check valid values
        INSERT INTO public.user_roles (user_id, role) VALUES (v_ceo_id, 'admin'); -- Using 'admin' as fallback if 'CEO' type is unknown
    END IF;

    -- Step 4: Cleanup non-CEO users
    DELETE FROM public.profiles WHERE email != 'agrovidanavanhulalda@gmail.com';
    
    -- Delete orphaned user roles
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        DELETE FROM public.user_roles WHERE user_id NOT IN (SELECT id FROM public.profiles);
    END IF;
END $$;

-- Step 5: Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 6: Security Functions and RLS
CREATE OR REPLACE FUNCTION public.is_ceo()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (is_super_admin = true OR role = 'CEO')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply CEO Root access to all tables
DO $$
DECLARE
    t TEXT;
    tables_to_secure TEXT[] := ARRAY['companies', 'profiles', 'audit_logs', 'products', 'vendas', 'sales', 'lojas', 'stores', 'financial', 'financeiro'];
BEGIN
    FOREACH t IN ARRAY tables_to_secure LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS "CEO full access" ON public.%I', t);
            EXECUTE format('CREATE POLICY "CEO full access" ON public.%I FOR ALL USING (public.is_ceo())', t);
        END IF;
    END LOOP;
END $$;
