-- 1. Funções de Segurança Otimizadas (Impedir Recursão)
CREATE OR REPLACE FUNCTION public.is_master_owner() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'is_master_owner')::boolean = true
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_company() 
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Tentar pegar do JWT para performance e evitar recursão
  v_company_id := (auth.jwt() -> 'user_metadata' ->> 'company_id')::UUID;
  
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
  END IF;
  
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_min_role(required_role text) 
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role text;
BEGIN
  -- Se for Master, ignora cargo
  IF public.is_master_owner() THEN RETURN TRUE; END IF;

  v_user_role := auth.jwt() -> 'user_metadata' ->> 'role';
  
  IF v_user_role IS NULL THEN
    SELECT role INTO v_user_role FROM public.company_users 
    WHERE user_id = auth.uid() AND company_id = public.get_my_company() LIMIT 1;
  END IF;

  IF v_user_role IS NULL THEN RETURN FALSE; END IF;

  -- Hierarquia simplificada para RLS
  CASE lower(required_role)
    WHEN 'viewer' THEN RETURN TRUE;
    WHEN 'seller' THEN RETURN v_user_role IN ('seller', 'manager', 'admin', 'owner', 'ceo', 'master');
    WHEN 'manager' THEN RETURN v_user_role IN ('manager', 'admin', 'owner', 'ceo', 'master');
    WHEN 'admin' THEN RETURN v_user_role IN ('admin', 'owner', 'ceo', 'master');
    WHEN 'owner' THEN RETURN v_user_role IN ('owner', 'ceo', 'master');
    WHEN 'ceo' THEN RETURN v_user_role IN ('ceo', 'master');
    ELSE RETURN v_user_role = 'master';
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Limpeza e Aplicação de Novo Padrão Enterprise
DO $$ 
DECLARE 
  t text;
  tables_to_fix text[] := ARRAY['profiles', 'company_users', 'branches', 'products', 'product_stock', 'inventory_movements', 'sales', 'sale_items', 'companies', 'stores'];
BEGIN
  FOREACH t IN ARRAY tables_to_fix LOOP
    -- Limpar políticas antigas que podem causar conflito
    EXECUTE 'DROP POLICY IF EXISTS "System can manage ' || t || '" ON public.' || t;
    EXECUTE 'DROP POLICY IF EXISTS "CEO full access" ON public.' || t;
    EXECUTE 'DROP POLICY IF EXISTS "Master owner full access" ON public.' || t;
    EXECUTE 'DROP POLICY IF EXISTS "Company isolation ' || t || '" ON public.' || t;
    EXECUTE 'DROP POLICY IF EXISTS "Master full access ' || t || '" ON public.' || t;
    
    -- Política Master (Acesso Global)
    EXECUTE 'CREATE POLICY "Master full access ' || t || '" ON public.' || t || ' FOR ALL USING (public.is_master_owner())';
    
    -- Política Company Isolation (Acesso por Empresa)
    IF t = 'companies' THEN
        EXECUTE 'DROP POLICY IF EXISTS "Company view self" ON public.companies';
        EXECUTE 'DROP POLICY IF EXISTS "CEO manage self company" ON public.companies';
        EXECUTE 'CREATE POLICY "Company view self" ON public.companies FOR SELECT USING (id = public.get_my_company())';
        EXECUTE 'CREATE POLICY "CEO manage self company" ON public.companies FOR UPDATE USING (id = public.get_my_company() AND public.has_min_role(''ceo''))';
    ELSIF t = 'profiles' THEN
        EXECUTE 'DROP POLICY IF EXISTS "Profiles isolation" ON public.profiles';
        EXECUTE 'CREATE POLICY "Profiles isolation" ON public.profiles FOR ALL USING (company_id = public.get_my_company() OR id = auth.uid())';
    ELSE
        EXECUTE 'CREATE POLICY "Company isolation ' || t || '" ON public.' || t || ' FOR ALL USING (company_id = public.get_my_company())';
    END IF;
  END LOOP;
END $$;

-- 3. Caso Especial: Permitir Login/SignUp (Profiles)
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
CREATE POLICY "Allow profile creation on signup" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Garantir que Gestores possam ver e gerenciar utilizadores da sua empresa
DROP POLICY IF EXISTS "Manager manages company users" ON public.company_users;
CREATE POLICY "Manager manages company users" ON public.company_users
FOR ALL USING (company_id = public.get_my_company() AND public.has_min_role('manager'));

-- 5. Tabelas de Configuração Global (Apenas leitura para todos)
DROP POLICY IF EXISTS "Roles viewable" ON public.roles;
CREATE POLICY "Roles viewable" ON public.roles FOR SELECT USING (true);
