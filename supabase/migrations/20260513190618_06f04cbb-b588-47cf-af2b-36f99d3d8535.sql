-- 2. Create/Update helper functions
CREATE OR REPLACE FUNCTION public.is_master_owner(user_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.app_role AS $$
DECLARE
  v_role public.app_role;
BEGIN
  SELECT role INTO v_role 
  FROM public.user_roles 
  WHERE user_roles.user_id = get_user_role.user_id 
  ORDER BY 
    CASE 
      WHEN role = 'ceo' THEN 1
      WHEN role = 'admin' THEN 2
      WHEN role = 'manager' THEN 3
      WHEN role = 'seller' THEN 4
      WHEN role = 'viewer' THEN 5
      ELSE 6
    END ASC
  LIMIT 1;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_minimum_role(user_id UUID, min_role public.app_role)
RETURNS boolean AS $$
DECLARE
  v_user_role public.app_role;
BEGIN
  -- Master owner always has access
  IF public.is_master_owner(user_id) THEN
    RETURN true;
  END IF;

  v_user_role := public.get_user_role(user_id);
  
  -- Hierarchy logic
  IF v_user_role = 'ceo' THEN
    RETURN true;
  END IF;
  
  IF v_user_role = 'admin' THEN
    RETURN min_role IN ('admin', 'manager', 'seller', 'viewer');
  END IF;
  
  IF v_user_role = 'manager' THEN
    RETURN min_role IN ('manager', 'seller', 'viewer');
  END IF;
  
  IF v_user_role = 'seller' THEN
    RETURN min_role IN ('seller', 'viewer');
  END IF;
  
  IF v_user_role = 'viewer' THEN
    RETURN min_role = 'viewer';
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate helpers with matching parameter names to avoid dependency issues
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN public.has_minimum_role(_user_id, 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN public.has_minimum_role(_user_id, 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update RLS Policies for critical tables

-- PRODUCTS
DROP POLICY IF EXISTS "Users can view products of their company" ON public.products;
CREATE POLICY "Users can view products of their company" ON public.products
FOR SELECT USING (
  public.is_master_owner(auth.uid()) OR 
  (company_id = public.get_user_company(auth.uid()) AND public.has_minimum_role(auth.uid(), 'viewer'))
);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
FOR ALL USING (
  public.is_master_owner(auth.uid()) OR 
  (company_id = public.get_user_company(auth.uid()) AND public.has_minimum_role(auth.uid(), 'manager'))
);

-- SALES
DROP POLICY IF EXISTS "Users can view sales of their company" ON public.sales;
CREATE POLICY "Users can view sales of their company" ON public.sales
FOR SELECT USING (
  public.is_master_owner(auth.uid()) OR 
  (company_id = public.get_user_company(auth.uid()) AND public.has_minimum_role(auth.uid(), 'viewer'))
);

DROP POLICY IF EXISTS "Sellers can create sales" ON public.sales;
CREATE POLICY "Sellers can create sales" ON public.sales
FOR INSERT WITH CHECK (
  public.is_master_owner(auth.uid()) OR 
  (company_id = public.get_user_company(auth.uid()) AND public.has_minimum_role(auth.uid(), 'seller'))
);

-- INVENTORY_MOVEMENTS
DROP POLICY IF EXISTS "Users can view movements of their company" ON public.inventory_movements;
CREATE POLICY "Users can view movements of their company" ON public.inventory_movements
FOR SELECT USING (
  public.is_master_owner(auth.uid()) OR 
  (company_id = public.get_user_company(auth.uid()) AND public.has_minimum_role(auth.uid(), 'viewer'))
);

DROP POLICY IF EXISTS "Managers can manage movements" ON public.inventory_movements;
CREATE POLICY "Managers can manage movements" ON public.inventory_movements
FOR INSERT WITH CHECK (
  public.is_master_owner(auth.uid()) OR 
  (company_id = public.get_user_company(auth.uid()) AND public.has_minimum_role(auth.uid(), 'manager'))
);

-- PROFILES
DROP POLICY IF EXISTS "Profiles are viewable by company members" ON public.profiles;
CREATE POLICY "Profiles are viewable by company members" ON public.profiles
FOR SELECT USING (
  public.is_master_owner(auth.uid()) OR 
  id = auth.uid() OR
  (company_id = public.get_user_company(auth.uid()) AND public.has_minimum_role(auth.uid(), 'manager'))
);

-- USER ROLES (Teams)
DROP POLICY IF EXISTS "Admins can manage company team" ON public.user_roles;
CREATE POLICY "Admins can manage company team" ON public.user_roles
FOR ALL USING (
  public.is_master_owner(auth.uid()) OR 
  (company_id = public.get_user_company(auth.uid()) AND public.has_minimum_role(auth.uid(), 'admin'))
);

-- COMPANIES
DROP POLICY IF EXISTS "CEOs can update their own company" ON public.companies;
CREATE POLICY "CEOs can update their own company" ON public.companies
FOR UPDATE USING (
  public.is_master_owner(auth.uid()) OR 
  (id = public.get_user_company(auth.uid()) AND public.has_minimum_role(auth.uid(), 'ceo'))
);
