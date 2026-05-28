-- 1. Drop existing constraints if they exist
ALTER TABLE public.company_users DROP CONSTRAINT IF EXISTS company_users_role_check;

-- 2. Migrate existing non-compliant roles to compliant ones across all tables
-- Table: user_roles
UPDATE public.user_roles 
SET role = CASE 
    WHEN LOWER(role::text) IN ('ceo', 'director', 'owner', 'financeiro') THEN 'admin'::public.app_role
    WHEN LOWER(role::text) IN ('manager', 'gerente') THEN 'manager'::public.app_role
    WHEN LOWER(role::text) IN ('admin', 'administrator', 'administrador') THEN 'admin'::public.app_role
    ELSE 'seller'::public.app_role
END
WHERE role::text NOT IN ('admin', 'manager', 'seller');

-- Table: company_users
UPDATE public.company_users 
SET role = CASE 
    WHEN LOWER(role) IN ('ceo', 'director', 'owner', 'financeiro', 'admin') THEN 'admin'
    WHEN LOWER(role) IN ('manager', 'gerente') THEN 'manager'
    ELSE 'seller'
END
WHERE role NOT IN ('admin', 'manager', 'seller');

-- Table: invitations
UPDATE public.invitations 
SET role = CASE 
    WHEN LOWER(role) IN ('ceo', 'director', 'owner', 'financeiro', 'admin') THEN 'admin'
    WHEN LOWER(role) IN ('manager', 'gerente') THEN 'manager'
    ELSE 'seller'
END
WHERE role NOT IN ('admin', 'manager', 'seller');

-- Table: company_invitations
UPDATE public.company_invitations 
SET role = CASE 
    WHEN LOWER(role) IN ('ceo', 'director', 'owner', 'financeiro', 'admin') THEN 'admin'
    WHEN LOWER(role) IN ('manager', 'gerente') THEN 'manager'
    ELSE 'seller'
END
WHERE role NOT IN ('admin', 'manager', 'seller');

-- 3. Clean up roles table
-- Consolidate to only admin, manager, seller
UPDATE public.roles SET key = 'admin' WHERE LOWER(key) NOT IN ('admin', 'manager', 'seller') AND LOWER(key) IN ('ceo', 'owner', 'director', 'financeiro');
UPDATE public.roles SET key = 'seller' WHERE LOWER(key) NOT IN ('admin', 'manager', 'seller');

-- Keep only one entry per key in the roles table
DELETE FROM public.roles 
WHERE id NOT IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER(PARTITION BY key ORDER BY created_at ASC) as rn
        FROM public.roles
        WHERE key IN ('admin', 'manager', 'seller')
    ) s
    WHERE rn = 1
);

-- Delete any remaining non-compliant entries in roles table
DELETE FROM public.roles WHERE key NOT IN ('admin', 'manager', 'seller');

-- 4. Re-add/Add CHECK constraints to enforce allowed roles
ALTER TABLE public.company_users 
ADD CONSTRAINT company_users_role_check 
CHECK (role IN ('admin', 'manager', 'seller'));

ALTER TABLE public.invitations 
ADD CONSTRAINT invitations_role_check 
CHECK (role IN ('admin', 'manager', 'seller'));

ALTER TABLE public.company_invitations 
ADD CONSTRAINT company_invitations_role_check 
CHECK (role IN ('admin', 'manager', 'seller'));

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role::text IN ('admin', 'manager', 'seller'));

-- 5. Update map_role_name function to be strictly compliant
CREATE OR REPLACE FUNCTION public.map_role_name(p_role TEXT)
RETURNS TEXT AS $$
DECLARE
    v_key TEXT;
BEGIN
    -- Try to find by name or key in roles table first (now only contains admin/manager/seller)
    SELECT key INTO v_key FROM public.roles WHERE LOWER(name) = LOWER(p_role) OR LOWER(key) = LOWER(p_role) LIMIT 1;
    
    IF v_key IS NOT NULL THEN
        RETURN v_key;
    END IF;

    -- Strict fallback manual mapping
    RETURN CASE LOWER(p_role)
        WHEN 'ceo' THEN 'admin'
        WHEN 'owner' THEN 'admin'
        WHEN 'admin' THEN 'admin'
        WHEN 'administrator' THEN 'admin'
        WHEN 'administrador' THEN 'admin'
        WHEN 'manager' THEN 'manager'
        WHEN 'gerente' THEN 'manager'
        WHEN 'seller' THEN 'seller'
        WHEN 'vendedor' THEN 'seller'
        WHEN 'financeiro' THEN 'admin'
        WHEN 'accountant' THEN 'seller'
        WHEN 'cashier' THEN 'seller'
        WHEN 'caixa' THEN 'seller'
        ELSE 'seller' -- Default to lowest privilege if unknown, but still compliant
    END;
END;
$$ LANGUAGE plpgsql;
