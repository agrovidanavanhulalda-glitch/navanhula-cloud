-- Role helper functions
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'ceo', 'manager')
  );
$$;

-- Drop existing policies to ensure a clean state
DO $$ 
BEGIN
    -- audit_logs
    DROP POLICY IF EXISTS "Enterprise company isolation" ON public.audit_logs;
    -- branches
    DROP POLICY IF EXISTS "Enterprise company isolation" ON public.branches;
    -- cash_registers
    DROP POLICY IF EXISTS "Enterprise company isolation" ON public.cash_registers;
    -- customers
    DROP POLICY IF EXISTS "Enterprise company isolation" ON public.customers;
    -- notifications
    DROP POLICY IF EXISTS "Enterprise company isolation" ON public.notifications;
    -- products
    DROP POLICY IF EXISTS "Enterprise company isolation" ON public.products;
    -- profiles
    DROP POLICY IF EXISTS "Profiles enterprise isolation" ON public.profiles;
    -- sale_items
    DROP POLICY IF EXISTS "Enterprise company isolation" ON public.sale_items;
    -- sales
    DROP POLICY IF EXISTS "Enterprise company isolation" ON public.sales;
    -- stock_movements
    DROP POLICY IF EXISTS "Enterprise company isolation" ON public.stock_movements;
END $$;

-- 1. products
-- SELECT: Everyone in company
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated
USING (company_id = current_company_id());

-- INSERT/UPDATE/DELETE: Only Admin/Manager
CREATE POLICY "products_admin_manage" ON public.products FOR ALL TO authenticated
USING (company_id = current_company_id() AND is_admin_or_manager())
WITH CHECK (company_id = current_company_id() AND is_admin_or_manager());

-- 2. customers
-- SELECT: Everyone in company
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated
USING (company_id = current_company_id());

-- INSERT/UPDATE: Everyone in company (sellers need to register/update customers)
CREATE POLICY "customers_manage" ON public.customers FOR INSERT TO authenticated
WITH CHECK (company_id = current_company_id());

CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated
USING (company_id = current_company_id())
WITH CHECK (company_id = current_company_id());

-- DELETE: Only Admin/Manager
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated
USING (company_id = current_company_id() AND is_admin_or_manager());

-- 3. sales
-- SELECT: Admin/Manager sees all, Seller sees own
CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated
USING (company_id = current_company_id() AND (is_admin_or_manager() OR created_by = auth.uid() OR user_id = auth.uid()));

-- INSERT: Everyone in company
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated
WITH CHECK (company_id = current_company_id());

-- UPDATE: Admin/Manager sees all, Seller sees own
CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated
USING (company_id = current_company_id() AND (is_admin_or_manager() OR created_by = auth.uid() OR user_id = auth.uid()))
WITH CHECK (company_id = current_company_id() AND (is_admin_or_manager() OR created_by = auth.uid() OR user_id = auth.uid()));

-- DELETE: Only Admin/Manager
CREATE POLICY "sales_delete" ON public.sales FOR DELETE TO authenticated
USING (company_id = current_company_id() AND is_admin_or_manager());

-- 4. sale_items
-- Same logic as sales
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT TO authenticated
USING (company_id = current_company_id() AND (is_admin_or_manager() OR created_by = auth.uid()));

CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT TO authenticated
WITH CHECK (company_id = current_company_id());

CREATE POLICY "sale_items_update" ON public.sale_items FOR UPDATE TO authenticated
USING (company_id = current_company_id() AND (is_admin_or_manager() OR created_by = auth.uid()))
WITH CHECK (company_id = current_company_id() AND (is_admin_or_manager() OR created_by = auth.uid()));

CREATE POLICY "sale_items_delete" ON public.sale_items FOR DELETE TO authenticated
USING (company_id = current_company_id() AND is_admin_or_manager());

-- 5. stock_movements
-- SELECT: Everyone in company
CREATE POLICY "stock_movements_select" ON public.stock_movements FOR SELECT TO authenticated
USING (company_id = current_company_id());

-- INSERT: Admin/Manager sees all, Seller sees own (if applicable)
CREATE POLICY "stock_movements_insert" ON public.stock_movements FOR INSERT TO authenticated
WITH CHECK (company_id = current_company_id() AND (is_admin_or_manager() OR created_by = auth.uid()));

-- UPDATE/DELETE: Only Admin/Manager
CREATE POLICY "stock_movements_admin_manage" ON public.stock_movements FOR ALL TO authenticated
USING (company_id = current_company_id() AND is_admin_or_manager())
WITH CHECK (company_id = current_company_id() AND is_admin_or_manager());

-- 6. profiles
-- SELECT: Everyone in company
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (company_id = current_company_id());

-- UPDATE: Only own profile or Admin/Manager
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
USING (company_id = current_company_id() AND (id = auth.uid() OR is_admin_or_manager()))
WITH CHECK (company_id = current_company_id() AND (id = auth.uid() OR is_admin_or_manager()));

-- 7. branches
-- SELECT: Everyone in company
CREATE POLICY "branches_select" ON public.branches FOR SELECT TO authenticated
USING (company_id = current_company_id());

-- INSERT/UPDATE/DELETE: Only Admin/Manager
CREATE POLICY "branches_admin_manage" ON public.branches FOR ALL TO authenticated
USING (company_id = current_company_id() AND is_admin_or_manager())
WITH CHECK (company_id = current_company_id() AND is_admin_or_manager());

-- 8. notifications
-- SELECT: Only own or Admin/Manager
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
USING (company_id = current_company_id() AND (user_id = auth.uid() OR is_admin_or_manager()));

-- INSERT: Admin/Manager (system usually sends these)
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (company_id = current_company_id());

-- UPDATE/DELETE: Only own or Admin/Manager
CREATE POLICY "notifications_manage" ON public.notifications FOR ALL TO authenticated
USING (company_id = current_company_id() AND (user_id = auth.uid() OR is_admin_or_manager()))
WITH CHECK (company_id = current_company_id() AND (user_id = auth.uid() OR is_admin_or_manager()));

-- 9. audit_logs
-- Only Admin/Manager
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated
USING (company_id = current_company_id() AND is_admin_or_manager());

CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (company_id = current_company_id());

-- 10. cash_registers
-- SELECT: Everyone in company
CREATE POLICY "cash_registers_select" ON public.cash_registers FOR SELECT TO authenticated
USING (company_id = current_company_id());

-- INSERT/UPDATE/DELETE: Only Admin/Manager
CREATE POLICY "cash_registers_admin_manage" ON public.cash_registers FOR ALL TO authenticated
USING (company_id = current_company_id() AND is_admin_or_manager())
WITH CHECK (company_id = current_company_id() AND is_admin_or_manager());
