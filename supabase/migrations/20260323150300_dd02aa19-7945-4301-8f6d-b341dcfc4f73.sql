
-- 1. Add smart stock fields to products (only if not exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'min_stock') THEN
    ALTER TABLE public.products ADD COLUMN min_stock INTEGER DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'max_stock') THEN
    ALTER TABLE public.products ADD COLUMN max_stock INTEGER NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'reorder_point') THEN
    ALTER TABLE public.products ADD COLUMN reorder_point INTEGER NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'last_sale_date') THEN
    ALTER TABLE public.products ADD COLUMN last_sale_date TIMESTAMPTZ NULL;
  END IF;
END $$;

-- 2. Create stock_alerts table
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('critical', 'low', 'out_of_stock', 'excess', 'inactive')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  UNIQUE(product_id, store_id, type, status)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_stock_alerts_company ON public.stock_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON public.stock_alerts(status);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON public.stock_alerts(product_id);

-- 4. RLS
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company alerts"
  ON public.stock_alerts FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can manage own company alerts"
  ON public.stock_alerts FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- 5. Evaluate stock alerts function
CREATE OR REPLACE FUNCTION public.evaluate_stock_alerts(p_store_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_company_id UUID;
  v_product RECORD;
  v_stock INTEGER;
  v_alert_type TEXT;
  v_message TEXT;
  v_count INTEGER := 0;
BEGIN
  SELECT company_id INTO v_company_id FROM stores WHERE id = p_store_id;
  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Loja não encontrada');
  END IF;

  -- Resolve all existing active alerts for this store first
  UPDATE stock_alerts SET status = 'resolved', resolved_at = now()
  WHERE store_id = p_store_id AND status = 'active';

  -- Evaluate each product
  FOR v_product IN
    SELECT p.id, p.name, p.min_stock, p.max_stock, p.reorder_point, p.last_sale_date,
           COALESCE(ps.quantity, 0) AS stock_qty
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id AND ps.store_id = p_store_id
    WHERE p.is_active = true
      AND (p.company_id = v_company_id OR p.company_id IS NULL)
  LOOP
    v_stock := v_product.stock_qty;
    v_alert_type := NULL;
    v_message := NULL;

    -- Out of stock
    IF v_stock <= 0 THEN
      v_alert_type := 'out_of_stock';
      v_message := 'Produto "' || v_product.name || '" está SEM ESTOQUE';
    -- Critical
    ELSIF v_stock <= COALESCE(v_product.min_stock, 5) THEN
      v_alert_type := 'critical';
      v_message := 'Produto "' || v_product.name || '" está CRÍTICO (' || v_stock || ' unidades)';
    -- Low / reorder
    ELSIF v_product.reorder_point IS NOT NULL AND v_stock <= v_product.reorder_point THEN
      v_alert_type := 'low';
      v_message := 'Produto "' || v_product.name || '" atingiu ponto de reposição (' || v_stock || ' un.)';
    -- Excess
    ELSIF v_product.max_stock IS NOT NULL AND v_stock > v_product.max_stock THEN
      v_alert_type := 'excess';
      v_message := 'Produto "' || v_product.name || '" em EXCESSO (' || v_stock || '/' || v_product.max_stock || ')';
    END IF;

    -- Inactive check (no sale in 15 days)
    IF v_stock > 0 AND v_product.last_sale_date IS NOT NULL
       AND v_product.last_sale_date < now() - interval '15 days' THEN
      INSERT INTO stock_alerts (product_id, store_id, company_id, type, message)
      VALUES (v_product.id, p_store_id, v_company_id, 'inactive',
              'Produto "' || v_product.name || '" sem vendas há ' ||
              EXTRACT(DAY FROM now() - v_product.last_sale_date)::integer || ' dias')
      ON CONFLICT (product_id, store_id, type, status) DO UPDATE SET message = EXCLUDED.message, created_at = now();
      v_count := v_count + 1;
    END IF;

    IF v_alert_type IS NOT NULL THEN
      INSERT INTO stock_alerts (product_id, store_id, company_id, type, message)
      VALUES (v_product.id, p_store_id, v_company_id, v_alert_type, v_message)
      ON CONFLICT (product_id, store_id, type, status) DO UPDATE SET message = EXCLUDED.message, created_at = now();
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object('success', true, 'alerts_generated', v_count);
END;
$$;

-- 6. Update last_sale_date on sale completion
CREATE OR REPLACE FUNCTION public.update_product_last_sale_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE products SET last_sale_date = now() WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_last_sale_date ON sale_items;
CREATE TRIGGER trg_update_last_sale_date
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_last_sale_date();
