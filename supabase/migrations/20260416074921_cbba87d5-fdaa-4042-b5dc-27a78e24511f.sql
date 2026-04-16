
-- 1. Add master/branch/client columns (already added by partial run of previous migration)
-- Use IF NOT EXISTS to be safe
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='company_type') THEN
    ALTER TABLE public.companies ADD COLUMN company_type text NOT NULL DEFAULT 'client';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='is_system_owner') THEN
    ALTER TABLE public.companies ADD COLUMN is_system_owner boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='billing_exempt') THEN
    ALTER TABLE public.companies ADD COLUMN billing_exempt boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='parent_company_id') THEN
    ALTER TABLE public.companies ADD COLUMN parent_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Truncate all existing tables safely
DO $$
DECLARE
  tbl text;
  tables_to_truncate text[] := ARRAY[
    'sale_items','sales','cash_movements','cash_registers','commissions','salesman_commissions',
    'stock_movements','stock_logs','stock_alerts','stock_reconciliation','stock_transfer_items',
    'stock_transfers','salesman_stock','product_stock','price_history','stock_adjustments',
    'fiscal_document_items','fiscal_documents','document_series','products','categories',
    'accounting_entries','journal_lines','journal_entries','accounts_payable','accounts_receivable',
    'expenses','bank_transactions','bank_accounts','payment_transactions','payment_logs',
    'payment_vouchers','manual_payments','wallet_transactions','wallets','payouts','platform_fees',
    'scheduled_payments','tax_calculations','tax_reports','financial_scores','financial_transactions',
    'cost_centers','agro_orders','agro_inputs','agro_producers','crops','dados_climaticos',
    'dados_satelite','insights_ia','ml_features','poultry_daily_records','poultry_inputs',
    'poultry_operational_costs','poultry_feed','poultry_production','poultry_batches',
    'criadores','compradores','pedidos_marketplace','marketplace_matches','customer_sellers',
    'customers','community_comments','community_likes','community_posts','alerts','system_alerts',
    'system_insights','notifications','automation_rules','workflows','webhook_deliveries','webhooks',
    'api_request_logs','api_keys','audit_logs','system_audit_logs','obligation_documents','obligations',
    'attendance','payroll_runs','sales_targets','employees','delivery_drivers','leads',
    'referral_logs','referral_signups','referrals','onboarding_progress','reseller_payout_items',
    'reseller_payouts','reseller_commissions','reseller_clients','reseller_materials','resellers',
    'subscriptions','currencies','warehouses','active_store','company_users','company_invitations',
    'user_roles','user_sessions','role_permissions','business_modules','chart_of_accounts',
    'accounting_rules','purchase_order_items','purchase_orders','suppliers','branches',
    'profiles','stores','companies'
  ];
BEGIN
  FOR tbl IN SELECT unnest(tables_to_truncate) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      EXECUTE format('TRUNCATE public.%I CASCADE', tbl);
    END IF;
  END LOOP;
END $$;

-- 3. Create helper function for master company access
CREATE OR REPLACE FUNCTION public.is_master_company_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.companies c ON c.id = p.company_id
    WHERE p.id = p_user_id AND c.is_system_owner = true
  );
$$;

-- 4. Function to get all visible company IDs (master sees all)
CREATE OR REPLACE FUNCTION public.get_master_visible_company_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id FROM public.companies c
  WHERE EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.companies mc ON mc.id = p.company_id
    WHERE p.id = p_user_id AND mc.is_system_owner = true
  )
  UNION
  SELECT company_id FROM public.profiles WHERE id = p_user_id;
$$;
