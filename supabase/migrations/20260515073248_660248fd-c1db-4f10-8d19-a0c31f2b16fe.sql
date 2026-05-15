-- 1. Create a secure non-recursive function to check roles
CREATE OR REPLACE FUNCTION public.check_user_role(p_user_id UUID, p_company_id UUID, p_required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = p_user_id 
    AND company_id = p_company_id
    AND role = ANY(p_required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop recursive policies
DROP POLICY IF EXISTS "Admins can manage company users" ON public.company_users;
DROP POLICY IF EXISTS "Manager manages company users" ON public.company_users;
DROP POLICY IF EXISTS "Users can see colleagues" ON public.company_users;
DROP POLICY IF EXISTS "Company isolation company_users" ON public.company_users;
DROP POLICY IF EXISTS "Master full access company_users" ON public.company_users;

-- 3. Recreate policies without recursion
CREATE POLICY "Master access company_users" 
ON public.company_users 
FOR ALL 
USING (is_master_owner());

CREATE POLICY "Company isolation select" 
ON public.company_users 
FOR SELECT 
USING (company_id = get_my_company() OR user_id = auth.uid());

CREATE POLICY "Admins manage company users" 
ON public.company_users 
FOR ALL 
USING (
  check_user_role(auth.uid(), company_id, ARRAY['admin', 'ceo', 'owner'])
)
WITH CHECK (
  check_user_role(auth.uid(), company_id, ARRAY['admin', 'ceo', 'owner'])
);

-- 4. Fix Inventory/Stock Policies
DROP POLICY IF EXISTS "Company isolation product_stock" ON public.product_stock;
DROP POLICY IF EXISTS "Master full access product_stock" ON public.product_stock;
DROP POLICY IF EXISTS "product_stock_isolation_all" ON public.product_stock;
DROP POLICY IF EXISTS "product_stock_isolation_select" ON public.product_stock;

CREATE POLICY "Master access product_stock" 
ON public.product_stock 
FOR ALL 
USING (is_master_owner());

CREATE POLICY "Company isolation product_stock" 
ON public.product_stock 
FOR ALL 
USING (company_id = get_my_company());

-- Ensure inventory_movements also has clear policies
DROP POLICY IF EXISTS "Company isolation inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Master full access inventory_movements" ON public.inventory_movements;

CREATE POLICY "Master access inventory_movements" 
ON public.inventory_movements 
FOR ALL 
USING (is_master_owner());

CREATE POLICY "Company isolation inventory_movements" 
ON public.inventory_movements 
FOR ALL 
USING (company_id = get_my_company());

-- 5. Fix possible NULL in inventory movements triggers
CREATE OR REPLACE FUNCTION public.process_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_current_qty INTEGER;
    v_product_name TEXT;
    v_company_id UUID;
BEGIN
    -- Ensure company_id is set
    IF NEW.company_id IS NULL THEN
        NEW.company_id := get_my_company();
    END IF;

    IF NEW.company_id IS NULL THEN
        RAISE EXCEPTION 'company_id é obrigatório para movimentos de inventário';
    END IF;

    IF NEW.branch_id IS NULL THEN
        RAISE EXCEPTION 'branch_id (loja) é obrigatório para movimentos de inventário';
    END IF;

    -- Ensure stock record exists
    INSERT INTO public.product_stock (product_id, store_id, quantity, company_id, created_by)
    VALUES (NEW.product_id, NEW.branch_id, 0, NEW.company_id, NEW.created_by)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    -- Lock for update
    SELECT quantity INTO v_current_qty
    FROM public.product_stock
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id
    FOR UPDATE;

    -- Check negative stock
    IF (COALESCE(v_current_qty, 0) + NEW.quantity) < 0 THEN
        SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
        RAISE EXCEPTION 'Stock insuficiente para "%". Disponível: %, Necessário: %', 
            COALESCE(v_product_name, 'Produto'), 
            COALESCE(v_current_qty, 0), 
            ABS(NEW.quantity);
    END IF;

    -- Update cache
    UPDATE public.product_stock
    SET quantity = COALESCE(quantity, 0) + NEW.quantity,
        updated_at = now()
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
