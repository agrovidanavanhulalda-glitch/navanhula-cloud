-- 1. Helper Central para Tenant Resolution
CREATE OR REPLACE FUNCTION public.get_user_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$function$;

-- 2. Helper para Master Owner (Super Admin)
CREATE OR REPLACE FUNCTION public.is_master_owner()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_super_admin = true OR company_id IN (SELECT id FROM public.companies WHERE is_system_owner = true))
  );
END;
$function$;

-- 3. Garantir colunas obrigatórias em tabelas core
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Adicionar company_id se não existir (exceto tabelas globais como 'companies')
        IF t NOT IN ('companies', 'business_modules', 'plans', 'roles', 'permissions', 'audit_logs') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id)', t);
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id)', t);
        END IF;
    END LOOP;
END $$;

-- 4. Padronização de RLS Enterprise para Tabelas Críticas

-- PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "standard_isolation" ON public.products;
CREATE POLICY "standard_isolation" ON public.products
FOR ALL TO authenticated
USING (is_master_owner() OR company_id = get_user_company_id())
WITH CHECK (is_master_owner() OR company_id = get_user_company_id());

-- SALES
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "standard_isolation" ON public.sales;
CREATE POLICY "standard_isolation" ON public.sales
FOR ALL TO authenticated
USING (is_master_owner() OR company_id = get_user_company_id())
WITH CHECK (is_master_owner() OR company_id = get_user_company_id());

-- BRANCHES
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "standard_isolation" ON public.branches;
CREATE POLICY "standard_isolation" ON public.branches
FOR ALL TO authenticated
USING (is_master_owner() OR company_id = get_user_company_id())
WITH CHECK (is_master_owner() OR company_id = get_user_company_id());

-- INVENTORY (product_stock)
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "standard_isolation" ON public.product_stock;
CREATE POLICY "standard_isolation" ON public.product_stock
FOR ALL TO authenticated
USING (is_master_owner() OR company_id = get_user_company_id())
WITH CHECK (is_master_owner() OR company_id = get_user_company_id());

-- TEAMS (company_users / user_roles)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "standard_isolation" ON public.user_roles;
CREATE POLICY "standard_isolation" ON public.user_roles
FOR ALL TO authenticated
USING (is_master_owner() OR user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = (SELECT company_id FROM public.profiles WHERE id = user_roles.user_id)
));

-- 5. Trigger Automático para Inserção de Tenant (company_id)
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar o trigger em tabelas core para evitar esquecimento no frontend
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_type = 'BASE TABLE'
             AND table_name IN ('products', 'sales', 'branches', 'product_stock', 'expenses', 'customers', 'suppliers')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_set_tenant ON public.%I', t);
        EXECUTE format('CREATE TRIGGER tr_set_tenant BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id()', t);
    END LOOP;
END $$;
