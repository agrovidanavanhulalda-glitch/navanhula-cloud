
-- Helper: check if current user is CEO (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_ceo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'ceo'
  )
$$;

-- Helper: get current user's company_id
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================
-- COMPANIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "CEO full access companies" ON companies;
DROP POLICY IF EXISTS "Users view own company" ON companies;
DROP POLICY IF EXISTS "CEO manages companies" ON companies;

CREATE POLICY "Users view own company" ON companies FOR SELECT TO authenticated
  USING (id = public.get_my_company_id() OR public.is_ceo());

CREATE POLICY "CEO manages companies" ON companies FOR ALL TO authenticated
  USING (public.is_ceo()) WITH CHECK (public.is_ceo());

-- ============================================
-- STORES
-- ============================================
DROP POLICY IF EXISTS "Users can view their store" ON stores;
DROP POLICY IF EXISTS "Users view own stores" ON stores;
DROP POLICY IF EXISTS "CEO manages stores" ON stores;

CREATE POLICY "Users view own stores" ON stores FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() OR public.is_ceo());

CREATE POLICY "CEO manages stores" ON stores FOR ALL TO authenticated
  USING (public.is_ceo()) WITH CHECK (public.is_ceo());

-- ============================================
-- PRODUCTS
-- ============================================
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can manage products" ON products;
DROP POLICY IF EXISTS "Company users view products" ON products;
DROP POLICY IF EXISTS "Company users manage products" ON products;

CREATE POLICY "Company users view products" ON products FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() OR public.is_ceo());

CREATE POLICY "Company users manage products" ON products FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() OR public.is_ceo())
  WITH CHECK (company_id = public.get_my_company_id() OR public.is_ceo());

-- ============================================
-- SALES
-- ============================================
DROP POLICY IF EXISTS "Users can view sales" ON sales;
DROP POLICY IF EXISTS "Users can create sales" ON sales;
DROP POLICY IF EXISTS "Company users view sales" ON sales;
DROP POLICY IF EXISTS "Company users manage sales" ON sales;

CREATE POLICY "Company users view sales" ON sales FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE company_id = public.get_my_company_id()) OR public.is_ceo());

CREATE POLICY "Company users manage sales" ON sales FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE company_id = public.get_my_company_id()) OR public.is_ceo())
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE company_id = public.get_my_company_id()) OR public.is_ceo());

-- ============================================
-- CATEGORIES
-- ============================================
DROP POLICY IF EXISTS "Users can view categories" ON categories;
DROP POLICY IF EXISTS "Users can manage categories" ON categories;
DROP POLICY IF EXISTS "Company users view categories" ON categories;
DROP POLICY IF EXISTS "Company users manage categories" ON categories;

CREATE POLICY "Company users view categories" ON categories FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id() OR company_id IS NULL OR public.is_ceo());

CREATE POLICY "Company users manage categories" ON categories FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id() OR public.is_ceo())
  WITH CHECK (company_id = public.get_my_company_id() OR public.is_ceo());

-- ============================================
-- PROFILES (self + CEO)
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users view profiles" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "CEO manages profiles" ON profiles;

CREATE POLICY "Users view profiles" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = public.get_my_company_id() OR public.is_ceo());

CREATE POLICY "Users update own profile" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_ceo());

CREATE POLICY "CEO manages profiles" ON profiles FOR ALL TO authenticated
  USING (public.is_ceo()) WITH CHECK (public.is_ceo());

-- ============================================
-- USER_ROLES (CEO can manage)
-- ============================================
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Users view own role" ON user_roles;
DROP POLICY IF EXISTS "CEO manages roles" ON user_roles;

CREATE POLICY "Users view own role" ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_ceo());

CREATE POLICY "CEO manages roles" ON user_roles FOR ALL TO authenticated
  USING (public.is_ceo()) WITH CHECK (public.is_ceo());
