
-- 1. stock_transfers
CREATE TABLE public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  from_admin_id uuid NOT NULL,
  to_salesman_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','FORCED_CONFIRMED')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  confirmed_by uuid
);

CREATE INDEX idx_stock_transfers_salesman ON public.stock_transfers(to_salesman_id);
CREATE INDEX idx_stock_transfers_company ON public.stock_transfers(company_id);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see company transfers"
ON public.stock_transfers FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.is_manager_or_admin(auth.uid()) OR to_salesman_id = auth.uid())
);

CREATE POLICY "Admins create transfers"
ON public.stock_transfers FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "Update own company transfers"
ON public.stock_transfers FOR UPDATE TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

-- 2. stock_transfer_items
CREATE TABLE public.stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_stock_transfer_items_transfer ON public.stock_transfer_items(transfer_id);

ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View transfer items"
ON public.stock_transfer_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stock_transfers st
    WHERE st.id = transfer_id
      AND st.company_id = public.get_user_company(auth.uid())
      AND (public.is_manager_or_admin(auth.uid()) OR st.to_salesman_id = auth.uid())
  )
);

CREATE POLICY "Admins insert transfer items"
ON public.stock_transfer_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stock_transfers st
    WHERE st.id = transfer_id
      AND st.company_id = public.get_user_company(auth.uid())
      AND public.is_manager_or_admin(auth.uid())
  )
);

-- 3. salesman_stock
CREATE TABLE public.salesman_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salesman_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salesman_id, product_id)
);

CREATE INDEX idx_salesman_stock_salesman ON public.salesman_stock(salesman_id);

ALTER TABLE public.salesman_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salesman sees own stock"
ON public.salesman_stock FOR SELECT TO authenticated
USING (
  salesman_id = auth.uid()
  OR (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
);

CREATE POLICY "System manages salesman stock"
ON public.salesman_stock FOR ALL TO authenticated
USING (company_id = public.get_user_company(auth.uid()))
WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- 4. stock_logs
CREATE TABLE public.stock_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  salesman_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  action text NOT NULL CHECK (action IN ('TRANSFER_IN','SALE','ADJUSTMENT')),
  quantity integer NOT NULL,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_logs_salesman ON public.stock_logs(salesman_id);

ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own logs"
ON public.stock_logs FOR SELECT TO authenticated
USING (
  salesman_id = auth.uid()
  OR (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
);

CREATE POLICY "System inserts logs"
ON public.stock_logs FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- 5. confirm_transfer function
CREATE OR REPLACE FUNCTION public.confirm_stock_transfer(p_transfer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transfer RECORD;
  v_item RECORD;
  v_company_id uuid;
BEGIN
  SELECT * INTO v_transfer FROM stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Transferência não encontrada');
  END IF;

  IF v_transfer.to_salesman_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'message', 'Esta transferência não pertence a si');
  END IF;

  IF v_transfer.status != 'PENDING' THEN
    RETURN json_build_object('success', false, 'message', 'Transferência já processada');
  END IF;

  v_company_id := v_transfer.company_id;

  FOR v_item IN SELECT * FROM stock_transfer_items WHERE transfer_id = p_transfer_id
  LOOP
    INSERT INTO salesman_stock (salesman_id, product_id, company_id, quantity)
    VALUES (v_transfer.to_salesman_id, v_item.product_id, v_company_id, v_item.quantity)
    ON CONFLICT (salesman_id, product_id)
    DO UPDATE SET quantity = salesman_stock.quantity + v_item.quantity, updated_at = now();

    INSERT INTO stock_logs (company_id, salesman_id, product_id, action, quantity, reference_id)
    VALUES (v_company_id, v_transfer.to_salesman_id, v_item.product_id, 'TRANSFER_IN', v_item.quantity, p_transfer_id);
  END LOOP;

  UPDATE stock_transfers
  SET status = 'CONFIRMED', confirmed_at = now(), confirmed_by = auth.uid()
  WHERE id = p_transfer_id;

  RETURN json_build_object('success', true, 'message', 'Transferência confirmada');
END;
$$;

-- 6. force_confirm function
CREATE OR REPLACE FUNCTION public.force_confirm_stock_transfer(p_transfer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transfer RECORD;
  v_item RECORD;
  v_company_id uuid;
BEGIN
  IF NOT is_manager_or_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissão');
  END IF;

  SELECT * INTO v_transfer FROM stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Transferência não encontrada');
  END IF;

  IF v_transfer.company_id != get_user_company(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissão');
  END IF;

  IF v_transfer.status != 'PENDING' THEN
    RETURN json_build_object('success', false, 'message', 'Transferência já processada');
  END IF;

  v_company_id := v_transfer.company_id;

  FOR v_item IN SELECT * FROM stock_transfer_items WHERE transfer_id = p_transfer_id
  LOOP
    INSERT INTO salesman_stock (salesman_id, product_id, company_id, quantity)
    VALUES (v_transfer.to_salesman_id, v_item.product_id, v_company_id, v_item.quantity)
    ON CONFLICT (salesman_id, product_id)
    DO UPDATE SET quantity = salesman_stock.quantity + v_item.quantity, updated_at = now();

    INSERT INTO stock_logs (company_id, salesman_id, product_id, action, quantity, reference_id)
    VALUES (v_company_id, v_transfer.to_salesman_id, v_item.product_id, 'TRANSFER_IN', v_item.quantity, p_transfer_id);
  END LOOP;

  UPDATE stock_transfers
  SET status = 'FORCED_CONFIRMED', confirmed_at = now(), confirmed_by = auth.uid()
  WHERE id = p_transfer_id;

  RETURN json_build_object('success', true, 'message', 'Transferência forçada com sucesso');
END;
$$;
