
-- 1. Create stock_movements table for full audit trail
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'ajuste')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL DEFAULT 0,
  new_stock INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  reference_type TEXT, -- 'purchase_order', 'sale', 'manual'
  reference_id UUID,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for performance
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_company ON public.stock_movements(company_id);
CREATE INDEX idx_stock_movements_store ON public.stock_movements(store_id);
CREATE INDEX idx_stock_movements_created ON public.stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(type);

-- 3. Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Users can view stock movements of their company"
  ON public.stock_movements FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can insert stock movements for their company"
  ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- 5. Function to record stock movement and update product_stock atomically
CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_product_id UUID,
  p_store_id UUID,
  p_type TEXT,
  p_quantity INTEGER,
  p_unit_cost NUMERIC DEFAULT 0,
  p_reference_type TEXT DEFAULT 'manual',
  p_reference_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_current_qty INTEGER;
  v_new_qty INTEGER;
  v_old_cost NUMERIC;
  v_new_avg_cost NUMERIC;
  v_movement_id UUID;
BEGIN
  -- Get company
  v_company_id := public.get_user_company(auth.uid());
  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Empresa não encontrada');
  END IF;

  -- Get current stock
  SELECT COALESCE(quantity, 0) INTO v_current_qty
  FROM product_stock WHERE product_id = p_product_id AND store_id = p_store_id;
  
  IF NOT FOUND THEN
    v_current_qty := 0;
    INSERT INTO product_stock (product_id, store_id, quantity)
    VALUES (p_product_id, p_store_id, 0);
  END IF;

  -- Calculate new stock
  IF p_type = 'entrada' THEN
    v_new_qty := v_current_qty + p_quantity;
  ELSIF p_type = 'saida' THEN
    v_new_qty := GREATEST(0, v_current_qty - p_quantity);
  ELSIF p_type = 'ajuste' THEN
    v_new_qty := p_quantity; -- direct set
  ELSE
    RETURN json_build_object('success', false, 'message', 'Tipo inválido');
  END IF;

  -- Update product_stock
  UPDATE product_stock
  SET quantity = v_new_qty, updated_at = now()
  WHERE product_id = p_product_id AND store_id = p_store_id;

  -- Update weighted average cost on entrada
  IF p_type = 'entrada' AND p_unit_cost > 0 THEN
    SELECT COALESCE(cost_price, 0) INTO v_old_cost FROM products WHERE id = p_product_id;
    IF (v_current_qty + p_quantity) > 0 THEN
      v_new_avg_cost := ROUND(((v_current_qty * v_old_cost) + (p_quantity * p_unit_cost)) / (v_current_qty + p_quantity), 2);
    ELSE
      v_new_avg_cost := p_unit_cost;
    END IF;
    UPDATE products SET cost_price = v_new_avg_cost WHERE id = p_product_id;
  END IF;

  -- Record movement
  INSERT INTO stock_movements (
    product_id, store_id, company_id, type, quantity,
    previous_stock, new_stock, unit_cost, total_cost,
    reference_type, reference_id, reason, created_by
  ) VALUES (
    p_product_id, p_store_id, v_company_id, p_type, p_quantity,
    v_current_qty, v_new_qty, p_unit_cost, p_quantity * p_unit_cost,
    p_reference_type, p_reference_id, p_reason, auth.uid()
  ) RETURNING id INTO v_movement_id;

  RETURN json_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'previous_stock', v_current_qty,
    'new_stock', v_new_qty,
    'cost_price', COALESCE(v_new_avg_cost, v_old_cost)
  );
END;
$$;

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
