
-- RPC: Create a branch company from master
CREATE OR REPLACE FUNCTION public.create_branch_company(
  p_name text,
  p_nif text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_country text DEFAULT 'MZ'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_company_id uuid;
  v_new_company_id uuid;
  v_new_store_id uuid;
BEGIN
  -- Get the master company for the calling user
  SELECT c.id INTO v_master_company_id
  FROM company_users cu
  JOIN companies c ON c.id = cu.company_id
  WHERE cu.user_id = auth.uid()
    AND c.is_system_owner = true
  LIMIT 1;

  IF v_master_company_id IS NULL THEN
    RAISE EXCEPTION 'Apenas a empresa MASTER pode criar filiais';
  END IF;

  -- Create the branch company
  INSERT INTO companies (name, nif, phone, address, city, country, company_type, parent_company_id, billing_exempt, is_system_owner, is_active)
  VALUES (p_name, p_nif, p_phone, p_address, p_city, p_country, 'branch', v_master_company_id, true, false, true)
  RETURNING id INTO v_new_company_id;

  -- Create a default store for the branch
  INSERT INTO stores (name, company_id, is_active)
  VALUES (p_name || ' - Loja Principal', v_new_company_id, true)
  RETURNING id INTO v_new_store_id;

  -- Enable all business modules for the branch
  INSERT INTO business_modules (company_id, comercio, agricultura, avicultura)
  VALUES (v_new_company_id, true, true, true);

  RETURN v_new_company_id;
END;
$$;

-- RPC: Get all companies visible to master (branches + clients)
CREATE OR REPLACE FUNCTION public.get_branch_companies()
RETURNS TABLE(
  id uuid,
  name text,
  company_type text,
  city text,
  country text,
  is_active boolean,
  billing_exempt boolean,
  created_at timestamptz,
  total_users bigint,
  total_stores bigint,
  total_revenue numeric,
  total_stock bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_master boolean;
BEGIN
  SELECT public.is_master_company_user(auth.uid()) INTO v_is_master;
  
  IF NOT v_is_master THEN
    RAISE EXCEPTION 'Acesso restrito à empresa MASTER';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.company_type,
    c.city,
    c.country,
    c.is_active,
    c.billing_exempt,
    c.created_at,
    (SELECT count(*) FROM company_users cu2 WHERE cu2.company_id = c.id)::bigint AS total_users,
    (SELECT count(*) FROM stores s WHERE s.company_id = c.id)::bigint AS total_stores,
    COALESCE((SELECT sum(sa.total) FROM sales sa JOIN stores st ON st.id = sa.store_id WHERE st.company_id = c.id AND sa.created_at >= date_trunc('month', now())), 0)::numeric AS total_revenue,
    COALESCE((SELECT sum(p.stock) FROM products p WHERE p.company_id = c.id), 0)::bigint AS total_stock
  FROM companies c
  WHERE c.company_type IN ('branch', 'client')
  ORDER BY c.created_at DESC;
END;
$$;

-- RPC: Toggle company active status (block/unblock)
CREATE OR REPLACE FUNCTION public.toggle_company_status(p_company_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_master_company_user(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito à empresa MASTER';
  END IF;

  UPDATE companies SET is_active = p_active, updated_at = now() WHERE id = p_company_id AND is_system_owner = false;
END;
$$;
