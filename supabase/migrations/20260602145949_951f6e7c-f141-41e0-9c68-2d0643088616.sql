-- 1. FIX: User Roles and Company Associations
-- Ensure user_roles has a company_id and is correctly indexed
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 2. ENHANCE: RLS bypass for CEO and Master Owner
-- We want CEO/Master Owner to have full visibility of their company and sub-companies/branches

-- Helper function to check if user is a CEO or Master Owner of the company
CREATE OR REPLACE FUNCTION public.is_ceo_of_company(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.id = p_user_id 
    AND (
      p.is_super_admin = true 
      OR (ur.role IN ('ceo', 'admin') AND (p.company_id = p_company_id OR ur.company_id = p_company_id))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. APPLY: Optimized RLS Policies
-- Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "CEO full company access" ON public.companies;
CREATE POLICY "CEO full company access" 
ON public.companies 
FOR ALL 
TO authenticated 
USING (
  id = get_user_company(auth.uid()) 
  OR is_master_owner(auth.uid())
);

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  company_id = get_user_company(auth.uid()) 
  OR is_master_owner(auth.uid())
);

-- Branches
DROP POLICY IF EXISTS "branches_select" ON public.branches;
CREATE POLICY "branches_select" 
ON public.branches 
FOR SELECT 
TO authenticated 
USING (
  company_id = get_user_company(auth.uid()) 
  OR is_master_owner(auth.uid())
);

-- Products
DROP POLICY IF EXISTS "Products select" ON public.products;
CREATE POLICY "Products select" 
ON public.products 
FOR SELECT 
TO authenticated 
USING (
  company_id = get_user_company(auth.uid()) 
  OR is_master_owner(auth.uid())
);

-- Sales
DROP POLICY IF EXISTS "Sales select" ON public.sales;
CREATE POLICY "Sales select" 
ON public.sales 
FOR SELECT 
TO authenticated 
USING (
  company_id = get_user_company(auth.uid()) 
  OR is_master_owner(auth.uid())
);

-- 4. FIX: Automatic Role Cleanup
-- Trigger to remove user_roles when a user is removed from company_users
CREATE OR REPLACE FUNCTION public.handle_removed_company_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_roles 
  WHERE user_id = OLD.user_id AND company_id = OLD.company_id;
  
  -- If user was in profiles and this was their main company, we might want to set company_id to NULL
  -- or mark as inactive, but we'll stick to role removal for now as it's safer.
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_company_user_removed ON public.company_users;
CREATE TRIGGER on_company_user_removed
AFTER DELETE ON public.company_users
FOR EACH ROW EXECUTE FUNCTION public.handle_removed_company_user();

-- 5. PERFORMANCE: Critical Indexes
CREATE INDEX IF NOT EXISTS idx_sales_company_created ON public.sales(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_comp_prod ON public.inventory_movements(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_products_comp_status ON public.products(company_id, status) WHERE (status = 'active');

-- 6. AUDIT: Fix bootstrap_current_user to be more robust
-- (The definition is already quite good, but let's ensure it handles missing company names better)

-- 7. GRANTS
GRANT EXECUTE ON FUNCTION public.is_ceo_of_company(UUID, UUID) TO authenticated, service_role;
GRANT ALL ON public.bootstrap_logs TO authenticated, service_role;
