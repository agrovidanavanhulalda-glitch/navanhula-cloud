
-- Inter-company/branch stock transfers
CREATE TABLE public.branch_stock_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_company_id UUID NOT NULL REFERENCES public.companies(id),
  to_company_id UUID NOT NULL REFERENCES public.companies(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  requested_by UUID,
  confirmed_by UUID,
  notes TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.branch_stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or master transfers"
  ON public.branch_stock_transfers FOR SELECT TO authenticated
  USING (
    from_company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
    OR to_company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
    OR public.is_master_company_user(auth.uid())
  );

CREATE POLICY "Create transfers from own company"
  ON public.branch_stock_transfers FOR INSERT TO authenticated
  WITH CHECK (
    from_company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
    OR public.is_master_company_user(auth.uid())
  );

CREATE POLICY "Update transfers as destination or master"
  ON public.branch_stock_transfers FOR UPDATE TO authenticated
  USING (
    to_company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
    OR public.is_master_company_user(auth.uid())
  );

CREATE INDEX idx_branch_transfers_status ON public.branch_stock_transfers(status);
CREATE INDEX idx_branch_transfers_from ON public.branch_stock_transfers(from_company_id);
CREATE INDEX idx_branch_transfers_to ON public.branch_stock_transfers(to_company_id);

-- Confirm or reject a branch transfer
CREATE OR REPLACE FUNCTION public.confirm_branch_transfer(
  p_transfer_id UUID,
  p_action TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer RECORD;
  v_from_store_id UUID;
  v_to_store_id UUID;
BEGIN
  SELECT * INTO v_transfer FROM branch_stock_transfers WHERE id = p_transfer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transferência não encontrada');
  END IF;
  IF v_transfer.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transferência já processada');
  END IF;

  IF NOT is_master_company_user(p_user_id) AND NOT EXISTS (
    SELECT 1 FROM company_users WHERE user_id = p_user_id AND company_id = v_transfer.to_company_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sem permissão');
  END IF;

  SELECT id INTO v_from_store_id FROM stores WHERE company_id = v_transfer.from_company_id LIMIT 1;
  SELECT id INTO v_to_store_id FROM stores WHERE company_id = v_transfer.to_company_id LIMIT 1;

  IF p_action = 'confirmed' THEN
    PERFORM record_stock_movement(
      v_transfer.product_id, v_from_store_id, 'saida', v_transfer.quantity,
      v_transfer.unit_cost, 'transfer', 'Transferência para filial'
    );
    PERFORM record_stock_movement(
      v_transfer.product_id, v_to_store_id, 'entrada', v_transfer.quantity,
      v_transfer.unit_cost, 'transfer', 'Transferência recebida'
    );
  END IF;

  UPDATE branch_stock_transfers
  SET status = p_action, confirmed_by = p_user_id, confirmed_at = now(), updated_at = now()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'status', p_action);
END;
$$;

-- Global stock aggregation for master users
CREATE OR REPLACE FUNCTION public.get_global_stock_summary(p_user_id UUID)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  product_code TEXT,
  total_quantity BIGINT,
  total_value NUMERIC,
  branch_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_master_company_user(p_user_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.code AS product_code,
    COALESCE(SUM(ps.quantity), 0)::BIGINT AS total_quantity,
    COALESCE(SUM(ps.quantity * p.cost_price), 0)::NUMERIC AS total_value,
    COUNT(DISTINCT s.company_id)::BIGINT AS branch_count
  FROM products p
  JOIN product_stock ps ON ps.product_id = p.id
  JOIN stores s ON s.id = ps.store_id
  WHERE p.is_active = true
  GROUP BY p.id, p.name, p.code
  ORDER BY p.name;
END;
$$;
