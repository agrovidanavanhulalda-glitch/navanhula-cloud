-- 1. Create a robust and unified company ID getter
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Priority 1: JWT metadata (performance)
  v_company_id := (auth.jwt() -> 'user_metadata' ->> 'company_id')::UUID;
  
  -- Priority 2: Profile query (fallback)
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
  END IF;
  
  RETURN v_company_id;
END;
$$;

-- 2. Create a robust store ID getter
CREATE OR REPLACE FUNCTION public.get_my_store_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  -- Priority 1: active_store table (runtime selection)
  SELECT store_id INTO v_store_id FROM public.active_store WHERE user_id = auth.uid() LIMIT 1;
  
  -- Priority 2: Profile query (default)
  IF v_store_id IS NULL THEN
    SELECT store_id INTO v_store_id FROM public.profiles WHERE id = auth.uid();
  END IF;
  
  RETURN v_store_id;
END;
$$;

-- 3. Cleanup existing conflicting policies for STORES
DROP POLICY IF EXISTS "Admins can manage stores in their company" ON public.stores;
DROP POLICY IF EXISTS "CEO manages stores" ON public.stores;
DROP POLICY IF EXISTS "Company isolation stores" ON public.stores;
DROP POLICY IF EXISTS "Master full access stores" ON public.stores;
DROP POLICY IF EXISTS "Users can view stores in their company" ON public.stores;
DROP POLICY IF EXISTS "Users view own stores" ON public.stores;

CREATE POLICY "Stores isolation policy" 
ON public.stores 
FOR ALL 
TO authenticated 
USING (company_id = get_my_company_id()) 
WITH CHECK (company_id = get_my_company_id());

-- 4. Cleanup existing conflicting policies for PRODUCTS
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Company isolation products" ON public.products;
DROP POLICY IF EXISTS "Managers can manage products" ON public.products;
DROP POLICY IF EXISTS "Master full access products" ON public.products;
DROP POLICY IF EXISTS "Users can delete products of their company" ON public.products;
DROP POLICY IF EXISTS "Users can insert products of their company" ON public.products;
DROP POLICY IF EXISTS "Users can update products of their company" ON public.products;
DROP POLICY IF EXISTS "Users can view company products" ON public.products;
DROP POLICY IF EXISTS "Users can view products of their company" ON public.products;
DROP POLICY IF EXISTS "standard_isolation" ON public.products;

CREATE POLICY "Products isolation policy" 
ON public.products 
FOR ALL 
TO authenticated 
USING (company_id = get_my_company_id()) 
WITH CHECK (company_id = get_my_company_id());

-- 5. Fix bootstrap_current_user to be more strict
CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_store_id uuid;
  v_company_id uuid;
  v_raw_meta jsonb;
BEGIN
  -- Get user info
  SELECT email, raw_user_meta_data INTO v_email, v_raw_meta FROM auth.users WHERE id = auth.uid();
  
  v_full_name := v_raw_meta ->> 'full_name';
  IF v_full_name IS NULL THEN v_full_name := split_part(v_email, '@', 1); END IF;

  -- 1. Ensure user has a company
  SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
  
  IF v_company_id IS NULL THEN
    -- Try to find a company they might already belong to (e.g. invited)
    SELECT company_id INTO v_company_id FROM public.user_company WHERE user_id = auth.uid() LIMIT 1;
    
    IF v_company_id IS NULL THEN
      -- Create a new default company for them if none exists at all
      INSERT INTO public.companies (name, is_active)
      VALUES (COALESCE(v_full_name, 'Minha Empresa') || ' - Matriz', true)
      RETURNING id INTO v_company_id;
    END IF;
  END IF;

  -- 2. Ensure company has at least one store
  SELECT id INTO v_store_id FROM public.stores WHERE company_id = v_company_id AND is_active = true ORDER BY created_at LIMIT 1;
  
  IF v_store_id IS NULL THEN
    INSERT INTO public.stores (name, company_id, is_active)
    VALUES ('Loja Principal', v_company_id, true)
    RETURNING id INTO v_store_id;
  END IF;

  -- 3. Sync profile
  INSERT INTO public.profiles (id, email, full_name, company_id, store_id, is_active, onboarding_completed)
  VALUES (auth.uid(), v_email, v_full_name, v_company_id, v_store_id, true, true)
  ON CONFLICT (id) DO UPDATE
    SET company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
        store_id = COALESCE(public.profiles.store_id, EXCLUDED.store_id),
        onboarding_completed = true;

  -- 4. Ensure roles
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin');
  END IF;
END;
$$;
