
-- =============================================
-- SECURITY FIXES
-- =============================================

-- 1. Fix employees: restrict sensitive data to managers/admins/HR/owner
DROP POLICY IF EXISTS "Users view company employees" ON public.employees;

CREATE POLICY "Users view company employees"
ON public.employees FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (
    profile_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'hr')
  )
);

-- 2. Fix payroll_runs: change from public to authenticated
DROP POLICY IF EXISTS "Admins manage payroll" ON public.payroll_runs;
DROP POLICY IF EXISTS "Managers view payroll" ON public.payroll_runs;

CREATE POLICY "Admins manage payroll"
ON public.payroll_runs FOR ALL TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'))
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'))
);

CREATE POLICY "Managers view payroll"
ON public.payroll_runs FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'hr'))
);

-- 3. Fix role_permissions: restrict to admin/CEO
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.role_permissions;

CREATE POLICY "Admins can read permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo')
);

-- 4. Fix payment_logs: restrict to managers/admins
DROP POLICY IF EXISTS "Company users can view payment logs" ON public.payment_logs;

CREATE POLICY "Managers can view payment logs"
ON public.payment_logs FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
);

-- 5. Fix company_assets storage: scope delete/update
DROP POLICY IF EXISTS "Users can delete company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update company assets" ON storage.objects;

CREATE POLICY "Users can delete company assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company_assets'
  AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
);

CREATE POLICY "Users can update company assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company_assets'
  AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
);

-- 6. Fix payment-proofs storage: scope uploads
DROP POLICY IF EXISTS "Authenticated users can upload proofs" ON storage.objects;

CREATE POLICY "Users can upload own company proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
);

-- 7. Fix compliance_documents storage: scope uploads
DROP POLICY IF EXISTS "compliance_upload" ON storage.objects;

CREATE POLICY "compliance_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'compliance_documents'
  AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
);

-- =============================================
-- AUTOMATION SYSTEM TABLES
-- =============================================

-- automation_rules
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL, -- stock_low, no_sales, high_expense, custom
  action_type text NOT NULL, -- generate_alert, block_sale, suggest_purchase, notify
  conditions jsonb NOT NULL DEFAULT '{}',
  actions jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 5,
  last_triggered_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view automation rules"
ON public.automation_rules FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage automation rules"
ON public.automation_rules FOR ALL TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
);

-- alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  alert_type text NOT NULL, -- stock_low, product_stale, sales_drop, high_expense, custom
  severity text NOT NULL DEFAULT 'info', -- info, warning, critical
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active, acknowledged, resolved, dismissed
  related_entity_type text, -- product, sale, expense
  related_entity_id uuid,
  rule_id uuid REFERENCES public.automation_rules(id),
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view alerts"
ON public.alerts FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage alerts"
ON public.alerts FOR ALL TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
);

CREATE INDEX idx_alerts_company_status ON public.alerts(company_id, status);
CREATE INDEX idx_alerts_type ON public.alerts(alert_type);

-- workflows
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  workflow_type text NOT NULL, -- stock_transfer, purchase_approval, expense_approval
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  priority text NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  data jsonb NOT NULL DEFAULT '{}',
  requested_by uuid NOT NULL,
  approved_by uuid,
  rejected_by uuid,
  rejection_reason text,
  approved_at timestamptz,
  rejected_at timestamptz,
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view workflows"
ON public.workflows FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can create workflows"
ON public.workflows FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND requested_by = auth.uid()
);

CREATE POLICY "Admins can manage workflows"
ON public.workflows FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
);

CREATE INDEX idx_workflows_company_status ON public.workflows(company_id, status);

-- system_insights
CREATE TABLE IF NOT EXISTS public.system_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  insight_type text NOT NULL, -- restock_suggestion, demand_forecast, sales_trend, cost_optimization
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'medium', -- low, medium, high
  data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new', -- new, read, actioned, dismissed
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view insights"
ON public.system_insights FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "System can manage insights"
ON public.system_insights FOR ALL TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
);

CREATE INDEX idx_insights_company_status ON public.system_insights(company_id, status);

-- =============================================
-- DB FUNCTION: evaluate automation rules
-- =============================================
CREATE OR REPLACE FUNCTION public.evaluate_automation_rules(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_low_stock jsonb;
  v_stale jsonb;
  v_alerts_created int := 0;
BEGIN
  -- 1. Stock low alerts
  FOR v_low_stock IN
    SELECT jsonb_build_object(
      'product_id', p.id,
      'product_name', p.name,
      'quantity', COALESCE(ps.quantity, 0),
      'threshold', p.low_stock_threshold
    )
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE p.company_id = p_company_id
      AND p.is_active = true
      AND COALESCE(ps.quantity, 0) <= p.low_stock_threshold
  LOOP
    INSERT INTO alerts (company_id, alert_type, severity, title, message, related_entity_type, related_entity_id)
    VALUES (
      p_company_id,
      'stock_low',
      CASE WHEN (v_low_stock->>'quantity')::int = 0 THEN 'critical' ELSE 'warning' END,
      'Estoque Baixo: ' || (v_low_stock->>'product_name'),
      'O produto ' || (v_low_stock->>'product_name') || ' tem apenas ' || (v_low_stock->>'quantity') || ' unidades (mínimo: ' || (v_low_stock->>'threshold') || ').',
      'product',
      (v_low_stock->>'product_id')::uuid
    )
    ON CONFLICT DO NOTHING;
    v_alerts_created := v_alerts_created + 1;
  END LOOP;

  -- 2. Stale products (no sales in 30 days)
  FOR v_stale IN
    SELECT jsonb_build_object(
      'product_id', p.id,
      'product_name', p.name,
      'days_since_sale', EXTRACT(DAY FROM now() - COALESCE(
        (SELECT MAX(s.created_at) FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.product_id = p.id),
        p.created_at
      ))::int
    )
    FROM products p
    WHERE p.company_id = p_company_id
      AND p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE si.product_id = p.id
          AND s.created_at > now() - interval '30 days'
      )
  LOOP
    INSERT INTO alerts (company_id, alert_type, severity, title, message, related_entity_type, related_entity_id)
    VALUES (
      p_company_id,
      'product_stale',
      'info',
      'Produto Parado: ' || (v_stale->>'product_name'),
      'O produto ' || (v_stale->>'product_name') || ' não tem vendas há ' || (v_stale->>'days_since_sale') || ' dias.',
      'product',
      (v_stale->>'product_id')::uuid
    )
    ON CONFLICT DO NOTHING;
    v_alerts_created := v_alerts_created + 1;
  END LOOP;

  v_result := jsonb_build_object('alerts_created', v_alerts_created);
  RETURN v_result;
END;
$$;

-- =============================================
-- DB FUNCTION: generate demand forecast
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_demand_forecast(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product record;
  v_insights_created int := 0;
  v_avg_daily numeric;
  v_forecast_30d numeric;
  v_current_stock numeric;
  v_days_remaining numeric;
BEGIN
  FOR v_product IN
    SELECT p.id, p.name, COALESCE(ps.quantity, 0) as stock_qty
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE p.company_id = p_company_id AND p.is_active = true
  LOOP
    -- Calculate average daily sales (last 60 days)
    SELECT COALESCE(SUM(si.quantity), 0) / 60.0
    INTO v_avg_daily
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE si.product_id = v_product.id
      AND s.status = 'completed'
      AND s.created_at > now() - interval '60 days';

    IF v_avg_daily > 0 THEN
      v_forecast_30d := ROUND(v_avg_daily * 30);
      v_current_stock := v_product.stock_qty;
      v_days_remaining := CASE WHEN v_avg_daily > 0 THEN ROUND(v_current_stock / v_avg_daily) ELSE 999 END;

      IF v_days_remaining < 14 THEN
        INSERT INTO system_insights (company_id, insight_type, title, message, priority, data, valid_until)
        VALUES (
          p_company_id,
          'restock_suggestion',
          'Reabastecer: ' || v_product.name,
          'Com a média actual de ' || ROUND(v_avg_daily, 1) || ' un/dia, o estoque de ' || v_product.name || ' dura apenas ' || v_days_remaining || ' dias. Sugerimos comprar ' || v_forecast_30d || ' unidades.',
          CASE WHEN v_days_remaining < 7 THEN 'high' ELSE 'medium' END,
          jsonb_build_object(
            'product_id', v_product.id,
            'avg_daily_sales', ROUND(v_avg_daily, 2),
            'forecast_30d', v_forecast_30d,
            'current_stock', v_current_stock,
            'days_remaining', v_days_remaining
          ),
          now() + interval '7 days'
        );
        v_insights_created := v_insights_created + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('insights_created', v_insights_created);
END;
$$;
