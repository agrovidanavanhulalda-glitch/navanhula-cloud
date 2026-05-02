-- Step 0: Handle potential conflicts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'role_permissions' AND schemaname = 'public') THEN
        ALTER TABLE public.role_permissions RENAME TO role_permissions_legacy;
    END IF;
END $$;

-- Step 1: Ensure companies table has correct fields
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;

-- Step 2: RBAC Tables
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Step 3: User-Company Junction (using user_company as requested)
CREATE TABLE IF NOT EXISTS public.user_company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, company_id)
);

-- Step 4: Invitations (using invites as requested)
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Step 5: Audit Logs (ensure fields)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Step 6: Populate Default Roles and Permissions
INSERT INTO public.roles (name) VALUES 
('CEO'), ('Admin'), ('Gerente'), ('Vendedor'), ('Financeiro')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (key, description) VALUES 
('create_user', 'Criar novos utilizadores'),
('delete_user', 'Remover utilizadores'),
('view_reports', 'Ver relatórios financeiros e de vendas'),
('manage_stock', 'Gerir stock e produtos'),
('manage_sales', 'Gerir vendas e faturação'),
('manage_finance', 'Gerir contas e pagamentos')
ON CONFLICT (key) DO NOTHING;

-- Map permissions
DO $$
DECLARE
    ceo_role_id UUID := (SELECT id FROM public.roles WHERE name = 'CEO');
    admin_role_id UUID := (SELECT id FROM public.roles WHERE name = 'Admin');
    manager_role_id UUID := (SELECT id FROM public.roles WHERE name = 'Gerente');
    seller_role_id UUID := (SELECT id FROM public.roles WHERE name = 'Vendedor');
    finance_role_id UUID := (SELECT id FROM public.roles WHERE name = 'Financeiro');
    perm_id UUID;
BEGIN
    -- CEO and Admin get all
    FOR perm_id IN SELECT id FROM public.permissions LOOP
        INSERT INTO public.role_permissions (role_id, permission_id) VALUES (ceo_role_id, perm_id) ON CONFLICT DO NOTHING;
        INSERT INTO public.role_permissions (role_id, permission_id) VALUES (admin_role_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Gerente
    INSERT INTO public.role_permissions (role_id, permission_id) 
    SELECT manager_role_id, id FROM public.permissions WHERE key IN ('view_reports', 'manage_stock', 'manage_sales')
    ON CONFLICT DO NOTHING;

    -- Vendedor
    INSERT INTO public.role_permissions (role_id, permission_id) 
    SELECT seller_role_id, id FROM public.permissions WHERE key IN ('manage_sales', 'manage_stock')
    ON CONFLICT DO NOTHING;

    -- Financeiro
    INSERT INTO public.role_permissions (role_id, permission_id) 
    SELECT finance_role_id, id FROM public.permissions WHERE key IN ('view_reports', 'manage_finance')
    ON CONFLICT DO NOTHING;
END $$;

-- Step 7: Security (RLS)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Helper Functions
CREATE OR REPLACE FUNCTION public.check_is_master(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_company uc
        JOIN public.companies c ON uc.company_id = c.id
        WHERE uc.user_id = user_uuid AND c.is_master = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_allowed_companies(user_uuid UUID)
RETURNS TABLE (company_id UUID) AS $$
BEGIN
    IF public.check_is_master(user_uuid) THEN
        RETURN QUERY SELECT id FROM public.companies;
    ELSE
        RETURN QUERY SELECT uc.company_id FROM public.user_company uc WHERE uc.user_id = user_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
DROP POLICY IF EXISTS "Roles read-only" ON public.roles;
CREATE POLICY "Roles read-only" ON public.roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permissions read-only" ON public.permissions;
CREATE POLICY "Permissions read-only" ON public.permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Role Permissions read-only" ON public.role_permissions;
CREATE POLICY "Role Permissions read-only" ON public.role_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Companies access" ON public.companies;
CREATE POLICY "Companies access" ON public.companies
FOR SELECT USING (id IN (SELECT get_user_allowed_companies(auth.uid())));

DROP POLICY IF EXISTS "User Company team access" ON public.user_company;
CREATE POLICY "User Company team access" ON public.user_company
FOR SELECT USING (company_id IN (SELECT get_user_allowed_companies(auth.uid())));

DROP POLICY IF EXISTS "Admins manage user_company" ON public.user_company;
CREATE POLICY "Admins manage user_company" ON public.user_company
FOR ALL USING (
    public.check_is_master(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.user_company admin_uc
        JOIN public.role_permissions rp ON admin_uc.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE admin_uc.user_id = auth.uid() 
        AND admin_uc.company_id = user_company.company_id
        AND p.key = 'create_user'
    )
);

DROP POLICY IF EXISTS "Invites access" ON public.invites;
CREATE POLICY "Invites access" ON public.invites
FOR SELECT USING (company_id IN (SELECT get_user_allowed_companies(auth.uid())));

DROP POLICY IF EXISTS "Manage invites" ON public.invites;
CREATE POLICY "Manage invites" ON public.invites
FOR ALL USING (
    public.check_is_master(auth.uid()) OR 
    EXISTS (
        SELECT 1 FROM public.user_company admin_uc
        JOIN public.role_permissions rp ON admin_uc.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE admin_uc.user_id = auth.uid() 
        AND admin_uc.company_id = invites.company_id
        AND p.key = 'create_user'
    )
);
