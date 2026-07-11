
CREATE OR REPLACE FUNCTION public.founder_system_audit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'founder'::app_role) THEN
    RAISE EXCEPTION 'Access denied: founder role required';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'companies', jsonb_build_object(
      'total',   (SELECT count(*) FROM companies),
      'active',  (SELECT count(*) FROM companies WHERE is_active = true),
      'blocked', (SELECT count(*) FROM companies WHERE is_active = false),
      'no_nif',  (SELECT count(*) FROM companies WHERE nif IS NULL AND is_active = true)
    ),
    'users', jsonb_build_object(
      'total',     (SELECT count(*) FROM profiles),
      'employees', (SELECT count(*) FROM employees WHERE status = 'active')
    ),
    'stores', jsonb_build_object(
      'total',    (SELECT count(*) FROM stores),
      'branches', (SELECT count(*) FROM branches)
    ),
    'products', jsonb_build_object(
      'total',      (SELECT count(*) FROM products WHERE is_active = true),
      'zero_price', (SELECT count(*) FROM products WHERE is_active = true AND sale_price = 0)
    ),
    'stock', jsonb_build_object(
      'low',      (SELECT count(*) FROM product_stock WHERE quantity < 10 AND quantity >= 0),
      'negative', (SELECT count(*) FROM product_stock WHERE quantity < 0)
    ),
    'subscriptions', jsonb_build_object(
      'active',  (SELECT count(*) FROM subscriptions WHERE status = 'active'),
      'expired', (SELECT count(*) FROM subscriptions WHERE status = 'active' AND current_period_end < now()),
      'trial',   (SELECT count(*) FROM subscriptions WHERE status = 'trial')
    ),
    'invoices', jsonb_build_object(
      'total', (SELECT count(*) FROM invoices),
      'paid',  (SELECT count(*) FROM invoices WHERE status = 'paid')
    ),
    'sales', jsonb_build_object(
      'total',       (SELECT count(*) FROM sales WHERE status = 'completed'),
      'no_profit',   (SELECT count(*) FROM sales WHERE status = 'completed' AND profit IS NULL),
      'revenue_30d', (SELECT COALESCE(sum(total),0) FROM sales WHERE status='completed' AND created_at > now() - interval '30 days')
    ),
    'leads', jsonb_build_object(
      'total', (SELECT count(*) FROM leads),
      'won',   (SELECT count(*) FROM leads WHERE converted_at IS NOT NULL),
      'lost',  (SELECT count(*) FROM leads WHERE lost_reason IS NOT NULL)
    ),
    'alerts', jsonb_build_object(
      'open',   (SELECT count(*) FROM alerts WHERE resolved_at IS NULL),
      'system', (SELECT count(*) FROM system_alerts WHERE status = 'open')
    ),
    'errors_24h',    (SELECT count(*) FROM system_errors WHERE created_at > now() - interval '24 hours'),
    'audit_logs_24h',(SELECT count(*) FROM audit_logs   WHERE created_at > now() - interval '24 hours'),
    'storage', jsonb_build_object(
      'db_size_bytes', pg_database_size(current_database())
    ),
    'health', jsonb_build_object(
      'stale_cash_registers', (SELECT count(*) FROM cash_registers WHERE status='open' AND opened_at < now() - interval '24 hours'),
      'overdue_payables',     (SELECT count(*) FROM accounts_payable WHERE status='pendente' AND due_date < current_date),
      'overdue_receivables',  (SELECT count(*) FROM accounts_receivable WHERE status='pendente' AND due_date < current_date)
    ),
    'backup', jsonb_build_object(
      'last_backup_at', (SELECT max(created_at) FROM founder_backups),
      'total_backups',  (SELECT count(*) FROM founder_backups)
    ),
    'performance', jsonb_build_object(
      'tables_count',  (SELECT count(*) FROM pg_stat_user_tables WHERE schemaname='public'),
      'indexes_count', (SELECT count(*) FROM pg_indexes WHERE schemaname='public')
    ),
    'kpis', jsonb_build_object(
      'mrr',       (SELECT COALESCE(sum(price_monthly),0)    FROM subscriptions WHERE status='active'),
      'arr',       (SELECT COALESCE(sum(price_monthly),0)*12 FROM subscriptions WHERE status='active'),
      'customers', (SELECT count(*) FROM customers)
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.founder_system_audit() FROM public;
GRANT EXECUTE ON FUNCTION public.founder_system_audit() TO authenticated;

-- ============ Materialized Views ============
DROP MATERIALIZED VIEW IF EXISTS public.founder_dashboard_metrics_mv CASCADE;
CREATE MATERIALIZED VIEW public.founder_dashboard_metrics_mv AS
SELECT
  (SELECT count(*) FROM companies WHERE is_active = true)                         AS companies_active,
  (SELECT count(*) FROM subscriptions WHERE status = 'active')                    AS subs_active,
  (SELECT COALESCE(sum(price_monthly),0) FROM subscriptions WHERE status='active')AS mrr,
  (SELECT count(*) FROM profiles)                                                 AS users_total,
  (SELECT count(*) FROM stores)                                                   AS stores_total,
  now() AS generated_at;
CREATE UNIQUE INDEX ON public.founder_dashboard_metrics_mv (generated_at);

DROP MATERIALIZED VIEW IF EXISTS public.ceo_dashboard_metrics_mv CASCADE;
CREATE MATERIALIZED VIEW public.ceo_dashboard_metrics_mv AS
SELECT
  s.company_id,
  count(DISTINCT s.id)          AS sales_count,
  COALESCE(sum(s.total),0)      AS revenue_total,
  COALESCE(sum(s.profit),0)     AS profit_total,
  count(DISTINCT s.store_id)    AS stores_count,
  now()                         AS generated_at
FROM sales s
WHERE s.status='completed' AND s.created_at > now() - interval '90 days'
GROUP BY s.company_id;
CREATE UNIQUE INDEX ON public.ceo_dashboard_metrics_mv (company_id);

DROP MATERIALIZED VIEW IF EXISTS public.crm_dashboard_metrics_mv CASCADE;
CREATE MATERIALIZED VIEW public.crm_dashboard_metrics_mv AS
SELECT
  l.company_id,
  count(*)                                                          AS leads_total,
  count(*) FILTER (WHERE l.converted_at IS NOT NULL)                AS leads_won,
  count(*) FILTER (WHERE l.lost_reason  IS NOT NULL)                AS leads_lost,
  count(*) FILTER (WHERE l.converted_at IS NULL AND l.lost_reason IS NULL) AS leads_open,
  COALESCE(sum(l.value_estimated) FILTER (WHERE l.converted_at IS NOT NULL),0) AS won_value,
  now()                                                             AS generated_at
FROM leads l
GROUP BY l.company_id;
CREATE UNIQUE INDEX ON public.crm_dashboard_metrics_mv (company_id);

DROP MATERIALIZED VIEW IF EXISTS public.billing_dashboard_metrics_mv CASCADE;
CREATE MATERIALIZED VIEW public.billing_dashboard_metrics_mv AS
SELECT
  i.company_id,
  count(*)                                                            AS invoices_total,
  count(*) FILTER (WHERE i.status='paid')                             AS invoices_paid,
  count(*) FILTER (WHERE i.status='pending')                          AS invoices_pending,
  COALESCE(sum(i.total_amount) FILTER (WHERE i.status='paid'),0)      AS paid_amount,
  COALESCE(sum(i.total_amount) FILTER (WHERE i.status='pending'),0)   AS pending_amount,
  now()                                                               AS generated_at
FROM invoices i
GROUP BY i.company_id;
CREATE UNIQUE INDEX ON public.billing_dashboard_metrics_mv (company_id);

DROP MATERIALIZED VIEW IF EXISTS public.inventory_dashboard_metrics_mv CASCADE;
CREATE MATERIALIZED VIEW public.inventory_dashboard_metrics_mv AS
SELECT
  p.company_id,
  count(DISTINCT p.id)                                          AS products_total,
  count(DISTINCT p.id) FILTER (WHERE p.is_active)               AS products_active,
  COALESCE(sum(ps.quantity),0)                                  AS stock_total,
  count(*) FILTER (WHERE ps.quantity < 10 AND ps.quantity >= 0) AS stock_low,
  count(*) FILTER (WHERE ps.quantity < 0)                       AS stock_negative,
  now()                                                         AS generated_at
FROM products p
LEFT JOIN product_stock ps ON ps.product_id = p.id
GROUP BY p.company_id;
CREATE UNIQUE INDEX ON public.inventory_dashboard_metrics_mv (company_id);

DROP MATERIALIZED VIEW IF EXISTS public.sales_dashboard_metrics_mv CASCADE;
CREATE MATERIALIZED VIEW public.sales_dashboard_metrics_mv AS
SELECT
  s.company_id,
  count(*)                    AS sales_30d,
  COALESCE(sum(s.total),0)    AS revenue_30d,
  COALESCE(sum(s.profit),0)   AS profit_30d,
  COALESCE(avg(s.total),0)    AS avg_ticket_30d,
  now()                       AS generated_at
FROM sales s
WHERE s.status='completed' AND s.created_at > now() - interval '30 days'
GROUP BY s.company_id;
CREATE UNIQUE INDEX ON public.sales_dashboard_metrics_mv (company_id);

GRANT SELECT ON public.founder_dashboard_metrics_mv   TO authenticated;
GRANT SELECT ON public.ceo_dashboard_metrics_mv       TO authenticated;
GRANT SELECT ON public.crm_dashboard_metrics_mv       TO authenticated;
GRANT SELECT ON public.billing_dashboard_metrics_mv   TO authenticated;
GRANT SELECT ON public.inventory_dashboard_metrics_mv TO authenticated;
GRANT SELECT ON public.sales_dashboard_metrics_mv     TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_dashboard_mvs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.founder_dashboard_metrics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.ceo_dashboard_metrics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.crm_dashboard_metrics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.billing_dashboard_metrics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.inventory_dashboard_metrics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.sales_dashboard_metrics_mv;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_dashboard_mvs() FROM public;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_mvs() TO service_role;

REFRESH MATERIALIZED VIEW public.founder_dashboard_metrics_mv;
REFRESH MATERIALIZED VIEW public.ceo_dashboard_metrics_mv;
REFRESH MATERIALIZED VIEW public.crm_dashboard_metrics_mv;
REFRESH MATERIALIZED VIEW public.billing_dashboard_metrics_mv;
REFRESH MATERIALIZED VIEW public.inventory_dashboard_metrics_mv;
REFRESH MATERIALIZED VIEW public.sales_dashboard_metrics_mv;
