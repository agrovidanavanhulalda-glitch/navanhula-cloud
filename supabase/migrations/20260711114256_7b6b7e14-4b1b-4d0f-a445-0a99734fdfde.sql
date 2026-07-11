
-- SPRINT 1: ENTERPRISE SQL OPTIMIZATION
-- Índices parciais e compostos para eliminar full-scans identificados no pg_stat_statements

-- 1) companies: WHERE nif IS NULL AND is_active = true  (system-audit)
CREATE INDEX IF NOT EXISTS idx_companies_active_nif_null
  ON public.companies (id)
  WHERE nif IS NULL AND is_active = true;

-- 2) product_stock: WHERE quantity < N  (auditoria de stock baixo)
CREATE INDEX IF NOT EXISTS idx_product_stock_low
  ON public.product_stock (store_id, product_id, quantity)
  WHERE quantity < 10;

-- 3) subscriptions: WHERE status = 'active' AND current_period_end < now()
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_expiring
  ON public.subscriptions (current_period_end, store_id)
  WHERE status = 'active';

-- 4) products: WHERE is_active = true AND sale_price = 0
CREATE INDEX IF NOT EXISTS idx_products_active_zero_price
  ON public.products (id)
  WHERE is_active = true AND sale_price = 0;

-- 5) Outros hot-paths dashboards (composite FK + tempo)
CREATE INDEX IF NOT EXISTS idx_sales_company_created
  ON public.sales (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_product
  ON public.sale_items (sale_id, product_id);

CREATE INDEX IF NOT EXISTS idx_leads_company_status_created
  ON public.leads (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_tx_company_date
  ON public.financial_transactions (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
  ON public.audit_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created
  ON public.system_audit_logs (created_at DESC, severity);

-- ANALYZE para atualizar planner
ANALYZE public.companies;
ANALYZE public.product_stock;
ANALYZE public.subscriptions;
ANALYZE public.products;
ANALYZE public.sales;
ANALYZE public.leads;
ANALYZE public.financial_transactions;
