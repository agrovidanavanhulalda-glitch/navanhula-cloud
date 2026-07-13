
-- SPRINT 1.1 — Enterprise Hardening (evidence-based, low-risk)

-- 1) Partial indexes for top-5 slow queries (system-audit checks)
CREATE INDEX IF NOT EXISTS idx_companies_missing_nif
  ON public.companies (id)
  WHERE nif IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_stock_negative
  ON public.product_stock (product_id, store_id)
  WHERE quantity < 0;

CREATE INDEX IF NOT EXISTS idx_subscriptions_expired_active
  ON public.subscriptions (current_period_end)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_products_zero_price_active
  ON public.products (id)
  WHERE is_active = true AND sale_price = 0;

CREATE INDEX IF NOT EXISTS idx_sale_items_zero_profit
  ON public.sale_items (id)
  WHERE profit = 0 AND total > 0;

CREATE INDEX IF NOT EXISTS idx_accounts_payable_pending_due
  ON public.accounts_payable (due_date)
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_pending_due
  ON public.accounts_receivable (due_date)
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_sales_completed_null_profit
  ON public.sales (id)
  WHERE status = 'completed' AND profit IS NULL;

CREATE INDEX IF NOT EXISTS idx_cash_registers_open_opened
  ON public.cash_registers (opened_at)
  WHERE status = 'open';

-- 2) Fix search_path on the only user function missing it
ALTER FUNCTION public.tg_touch_updated_at() SET search_path = public;

-- 3) Reduce cron pressure: system-audit hourly (was every 30min)
SELECT cron.unschedule(1);
SELECT cron.schedule(
  'system-audit-hourly',
  '0 * * * *',
  $$SELECT net.http_post(
    url := 'https://evkypmrihrgmvqejqxfe.supabase.co/functions/v1/system-audit',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := jsonb_build_object('time', now())
  );$$
);

-- 4) Remove duplicate process-task-queue cron (jobs 4 and 7 both run every minute)
SELECT cron.unschedule(7);
