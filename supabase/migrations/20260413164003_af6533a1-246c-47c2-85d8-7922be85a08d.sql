
-- 1. salesman_commissions
CREATE TABLE IF NOT EXISTS public.salesman_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  salesman_id UUID NOT NULL,
  sale_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.salesman_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own company commissions" ON public.salesman_commissions
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins manage commissions" ON public.salesman_commissions
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- 2. stock_reconciliation
CREATE TABLE IF NOT EXISTS public.stock_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  salesman_id UUID NOT NULL,
  product_id UUID NOT NULL,
  expected_stock INTEGER NOT NULL DEFAULT 0,
  actual_stock INTEGER NOT NULL DEFAULT 0,
  difference INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OK',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.stock_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users see reconciliation" ON public.stock_reconciliation
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins manage reconciliation" ON public.stock_reconciliation
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- 3. system_alerts
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  salesman_id UUID,
  product_id UUID,
  status TEXT NOT NULL DEFAULT 'UNREAD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users see alerts" ON public.system_alerts
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins manage alerts" ON public.system_alerts
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- 4. sales_targets
CREATE TABLE IF NOT EXISTS public.sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  salesman_id UUID NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users see targets" ON public.sales_targets
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins manage targets" ON public.sales_targets
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- 5. Add columns to stock_logs
ALTER TABLE public.stock_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.stock_logs ADD COLUMN IF NOT EXISTS device TEXT;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_salesman_commissions_salesman ON public.salesman_commissions(salesman_id);
CREATE INDEX IF NOT EXISTS idx_salesman_commissions_company ON public.salesman_commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_reconciliation_salesman ON public.stock_reconciliation(salesman_id);
CREATE INDEX IF NOT EXISTS idx_stock_reconciliation_company ON public.stock_reconciliation(company_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_company ON public.system_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON public.system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sales_targets_salesman ON public.sales_targets(salesman_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_company ON public.sales_targets(company_id);

-- 7. Reconciliation function
CREATE OR REPLACE FUNCTION public.run_stock_reconciliation(p_salesman_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id UUID;
  v_item RECORD;
  v_expected INTEGER;
  v_diff INTEGER;
  v_status TEXT;
  v_count INTEGER := 0;
  v_alerts INTEGER := 0;
BEGIN
  v_company_id := get_user_company(auth.uid());
  IF NOT is_manager_or_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissão');
  END IF;

  FOR v_item IN
    SELECT ss.product_id, ss.quantity as actual
    FROM salesman_stock ss
    WHERE ss.salesman_id = p_salesman_id AND ss.company_id = v_company_id
  LOOP
    -- Expected = total transferred in - total sold
    SELECT COALESCE(SUM(CASE WHEN action = 'TRANSFER_IN' THEN quantity ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN action = 'SALE' THEN quantity ELSE 0 END), 0)
    INTO v_expected
    FROM stock_logs
    WHERE salesman_id = p_salesman_id AND product_id = v_item.product_id;

    v_diff := v_item.actual - v_expected;
    v_status := CASE
      WHEN ABS(v_diff) = 0 THEN 'OK'
      WHEN ABS(v_diff) <= 3 THEN 'WARNING'
      ELSE 'CRITICAL'
    END;

    INSERT INTO stock_reconciliation (company_id, salesman_id, product_id, expected_stock, actual_stock, difference, status, created_by)
    VALUES (v_company_id, p_salesman_id, v_item.product_id, v_expected, v_item.actual, v_diff, v_status, auth.uid());
    v_count := v_count + 1;

    IF v_status = 'CRITICAL' THEN
      INSERT INTO system_alerts (company_id, type, message, salesman_id, product_id)
      VALUES (v_company_id, 'FRAUD_ALERT',
        'Diferença crítica de stock detectada: esperado ' || v_expected || ', actual ' || v_item.actual || ' (diff: ' || v_diff || ')',
        p_salesman_id, v_item.product_id);
      v_alerts := v_alerts + 1;
    END IF;
  END LOOP;

  RETURN json_build_object('success', true, 'reconciled', v_count, 'alerts', v_alerts);
END;
$$;

-- 8. Updated timestamp trigger for sales_targets
CREATE TRIGGER update_sales_targets_updated_at
  BEFORE UPDATE ON public.sales_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
