
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  company_id uuid,
  store_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MZN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled','refunded')),
  issue_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz,
  paid_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  plan_tier text,
  payment_method text,
  payment_reference text,
  notes text,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage all invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_founder(auth.uid()))
  WITH CHECK (public.is_founder(auth.uid()));

CREATE POLICY "Users read their company invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid() AND cu.company_id = invoices.company_id
  ));

CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date DESC);

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n bigint;
BEGIN
  n := nextval('invoice_number_seq');
  RETURN 'INV-' || to_char(now(),'YYYY') || '-' || lpad(n::text,6,'0');
END $$;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.founder_revenue_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_mrr numeric := 0; v_arr numeric := 0;
  v_revenue_month numeric := 0; v_revenue_total numeric := 0;
  v_active int := 0; v_trial int := 0; v_past_due int := 0;
  v_cancelled int := 0; v_suspended int := 0;
  v_churn numeric := 0; v_ltv numeric := 0; v_arpu numeric := 0;
  v_by_plan jsonb; v_last_12 jsonb;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT COALESCE(SUM(price_monthly),0) INTO v_mrr FROM subscriptions
    WHERE status::text IN ('active','warning','past_due');
  v_arr := v_mrr * 12;
  SELECT COUNT(*) FILTER (WHERE status::text IN ('active','warning')),
         COUNT(*) FILTER (WHERE status::text='trial'),
         COUNT(*) FILTER (WHERE status::text='past_due'),
         COUNT(*) FILTER (WHERE status::text='cancelled'),
         COUNT(*) FILTER (WHERE status::text IN ('suspended','blocked'))
    INTO v_active, v_trial, v_past_due, v_cancelled, v_suspended FROM subscriptions;
  SELECT COALESCE(SUM(total_amount),0) INTO v_revenue_month
    FROM invoices WHERE status='paid' AND paid_at >= date_trunc('month', now());
  SELECT COALESCE(SUM(total_amount),0) INTO v_revenue_total
    FROM invoices WHERE status='paid';
  IF (v_active + v_cancelled) > 0 THEN
    v_churn := round((v_cancelled::numeric / NULLIF(v_active + v_cancelled,0)) * 100, 2);
  END IF;
  IF v_active > 0 THEN
    v_arpu := round(v_mrr / v_active, 2);
    v_ltv := round(v_arpu * 24, 2);
  END IF;
  SELECT jsonb_agg(jsonb_build_object('plan', plan_tier, 'count', c, 'mrr', mrr))
    INTO v_by_plan FROM (
      SELECT plan_tier::text, COUNT(*) c, COALESCE(SUM(price_monthly),0) mrr
      FROM subscriptions WHERE status::text IN ('active','warning','trial','past_due')
      GROUP BY plan_tier
    ) s;
  SELECT jsonb_agg(jsonb_build_object('month', mnth, 'revenue', revenue) ORDER BY mnth)
    INTO v_last_12 FROM (
      SELECT to_char(date_trunc('month', paid_at),'YYYY-MM') AS mnth,
             COALESCE(SUM(total_amount),0) AS revenue
      FROM invoices WHERE status='paid' AND paid_at >= (now() - interval '12 months')
      GROUP BY 1
    ) m;
  RETURN jsonb_build_object(
    'mrr', v_mrr, 'arr', v_arr,
    'revenue_month', v_revenue_month, 'revenue_total', v_revenue_total,
    'active', v_active, 'trial', v_trial, 'past_due', v_past_due,
    'cancelled', v_cancelled, 'suspended', v_suspended,
    'churn_rate', v_churn, 'arpu', v_arpu, 'ltv', v_ltv,
    'by_plan', COALESCE(v_by_plan,'[]'::jsonb),
    'revenue_12m', COALESCE(v_last_12,'[]'::jsonb)
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.founder_revenue_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.founder_revenue_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.founder_subscription_transition(
  p_subscription_id uuid, p_new_status text, p_reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  UPDATE subscriptions SET status = p_new_status::subscription_status,
    blocked_at = CASE WHEN p_new_status IN ('suspended','blocked','cancelled') THEN now() ELSE NULL END,
    notes = COALESCE(p_reason, notes), updated_at = now()
  WHERE id = p_subscription_id;
  INSERT INTO founder_audit_log (founder_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(),'subscription_transition','subscription',p_subscription_id,
    jsonb_build_object('new_status',p_new_status,'reason',p_reason));
END $$;
REVOKE EXECUTE ON FUNCTION public.founder_subscription_transition(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.founder_subscription_transition(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.founder_invoice_create(
  p_subscription_id uuid, p_amount numeric, p_tax numeric DEFAULT 0,
  p_period_start timestamptz DEFAULT NULL, p_period_end timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_sub subscriptions%ROWTYPE;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO v_sub FROM subscriptions WHERE id = p_subscription_id;
  INSERT INTO invoices (invoice_number, subscription_id, company_id, store_id,
    amount, tax_amount, total_amount, status, issue_date, due_date,
    period_start, period_end, plan_tier, notes)
  VALUES (generate_invoice_number(), p_subscription_id, v_sub.company_id, v_sub.store_id,
    p_amount, p_tax, p_amount + p_tax, 'pending', now(), now() + interval '7 days',
    COALESCE(p_period_start, v_sub.current_period_start),
    COALESCE(p_period_end, v_sub.current_period_end),
    v_sub.plan_tier::text, p_notes)
  RETURNING id INTO v_id;
  INSERT INTO founder_audit_log (founder_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(),'invoice_create','invoice',v_id, jsonb_build_object('amount',p_amount));
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.founder_invoice_create(uuid,numeric,numeric,timestamptz,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.founder_invoice_create(uuid,numeric,numeric,timestamptz,timestamptz,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.founder_invoice_mark_paid(
  p_invoice_id uuid, p_method text DEFAULT NULL, p_reference text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  UPDATE invoices SET status='paid', paid_at=now(),
    payment_method=COALESCE(p_method,payment_method),
    payment_reference=COALESCE(p_reference,payment_reference),
    updated_at=now()
  WHERE id = p_invoice_id;
  INSERT INTO founder_audit_log (founder_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(),'invoice_paid','invoice',p_invoice_id,
    jsonb_build_object('method',p_method,'reference',p_reference));
END $$;
REVOKE EXECUTE ON FUNCTION public.founder_invoice_mark_paid(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.founder_invoice_mark_paid(uuid,text,text) TO authenticated;
