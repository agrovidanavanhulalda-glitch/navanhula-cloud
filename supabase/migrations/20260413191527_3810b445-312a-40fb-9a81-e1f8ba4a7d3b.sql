
-- 1. company_users table
CREATE TABLE IF NOT EXISTS public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('owner','admin','manager','seller','accountant')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','invited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- Helper: get all company_ids for current user (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND status = 'active'
  UNION
  SELECT company_id FROM public.profiles WHERE id = auth.uid() AND company_id IS NOT NULL
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_company_ids FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_company_ids TO authenticated;

-- Helper: check role in company
CREATE OR REPLACE FUNCTION public.has_company_role(_company_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid() AND company_id = _company_id AND role = _role AND status = 'active'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_company_role FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_company_role TO authenticated;

-- company_users policies
CREATE POLICY "Users see their company memberships"
  ON public.company_users FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Owners/admins manage company users"
  ON public.company_users FOR INSERT TO authenticated
  WITH CHECK (
    public.has_company_role(company_id, 'owner') OR public.has_company_role(company_id, 'admin')
    OR public.is_manager_or_admin(auth.uid())
  );

CREATE POLICY "Owners/admins update company users"
  ON public.company_users FOR UPDATE TO authenticated
  USING (
    public.has_company_role(company_id, 'owner') OR public.has_company_role(company_id, 'admin')
    OR public.is_manager_or_admin(auth.uid())
  );

CREATE POLICY "Owners/admins delete company users"
  ON public.company_users FOR DELETE TO authenticated
  USING (
    public.has_company_role(company_id, 'owner') OR public.has_company_role(company_id, 'admin')
    OR public.is_manager_or_admin(auth.uid())
  );

CREATE INDEX idx_company_users_user ON public.company_users(user_id);
CREATE INDEX idx_company_users_company ON public.company_users(company_id);

-- 2. tax_reports table
CREATE TABLE IF NOT EXISTS public.tax_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'monthly' CHECK (report_type IN ('monthly','quarterly','annual')),
  total_sales NUMERIC NOT NULL DEFAULT 0,
  total_tax NUMERIC NOT NULL DEFAULT 0,
  total_expenses NUMERIC NOT NULL DEFAULT 0,
  net_result NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved')),
  generated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view tax reports"
  ON public.tax_reports FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Admins manage tax reports"
  ON public.tax_reports FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids()) AND public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Admins update tax reports"
  ON public.tax_reports FOR UPDATE TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()) AND public.is_manager_or_admin(auth.uid()));

CREATE INDEX idx_tax_reports_company ON public.tax_reports(company_id);

-- 3. bank_accounts table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT,
  account_holder TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MZN',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view bank accounts"
  ON public.bank_accounts FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Admins manage bank accounts"
  ON public.bank_accounts FOR ALL TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids()) AND public.is_manager_or_admin(auth.uid()));

CREATE INDEX idx_bank_accounts_company ON public.bank_accounts(company_id);

-- 4. bank_transactions table
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit','debit')),
  description TEXT,
  reference TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reconciled BOOLEAN NOT NULL DEFAULT false,
  reconciled_with UUID,
  imported_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view bank transactions"
  ON public.bank_transactions FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Admins manage bank transactions"
  ON public.bank_transactions FOR ALL TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids()) AND public.is_manager_or_admin(auth.uid()));

CREATE INDEX idx_bank_tx_account ON public.bank_transactions(bank_account_id);
CREATE INDEX idx_bank_tx_company ON public.bank_transactions(company_id);
CREATE INDEX idx_bank_tx_date ON public.bank_transactions(transaction_date);

-- 5. api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  rate_limit INTEGER NOT NULL DEFAULT 1000,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins manage API keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()) AND public.is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids()) AND public.is_manager_or_admin(auth.uid()));

CREATE INDEX idx_api_keys_company ON public.api_keys(company_id);
CREATE INDEX idx_api_keys_prefix ON public.api_keys(key_prefix);

-- 6. Add missing fields to companies if not present
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MZN';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'pro';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;

-- 7. Tax fields on products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'IVA';

-- 8. Generate tax report function
CREATE OR REPLACE FUNCTION public.generate_tax_report(
  p_company_id UUID,
  p_start DATE,
  p_end DATE,
  p_type TEXT DEFAULT 'monthly'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sales NUMERIC;
  v_tax NUMERIC;
  v_expenses NUMERIC;
  v_net NUMERIC;
  v_report_id UUID;
BEGIN
  IF NOT is_manager_or_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissão');
  END IF;

  SELECT COALESCE(SUM(s.total), 0), COALESCE(SUM(s.total * 0.16), 0)
  INTO v_sales, v_tax
  FROM sales s JOIN stores st ON s.store_id = st.id
  WHERE st.company_id = p_company_id
    AND s.created_at::date BETWEEN p_start AND p_end
    AND s.status = 'completed';

  SELECT COALESCE(SUM(amount), 0) INTO v_expenses
  FROM expenses
  WHERE company_id = p_company_id
    AND expense_date::date BETWEEN p_start AND p_end;

  v_net := v_sales - v_expenses;

  INSERT INTO tax_reports (company_id, period_start, period_end, report_type, total_sales, total_tax, total_expenses, net_result, tax_rate, generated_by, status)
  VALUES (p_company_id, p_start, p_end, p_type, v_sales, v_tax, v_expenses, v_net, 16, auth.uid(), 'draft')
  RETURNING id INTO v_report_id;

  RETURN json_build_object('success', true, 'report_id', v_report_id, 'sales', v_sales, 'tax', v_tax, 'expenses', v_expenses, 'net', v_net);
END;
$$;

-- 9. Bank reconciliation function
CREATE OR REPLACE FUNCTION public.reconcile_bank_transactions(p_bank_account_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matched INTEGER := 0;
  v_bt RECORD;
  v_ft_id UUID;
BEGIN
  FOR v_bt IN
    SELECT * FROM bank_transactions
    WHERE bank_account_id = p_bank_account_id AND reconciled = false
  LOOP
    SELECT id INTO v_ft_id
    FROM financial_transactions ft
    WHERE ft.company_id = v_bt.company_id
      AND ABS(ft.amount - ABS(v_bt.amount)) < 0.01
      AND ft.transaction_date = v_bt.transaction_date
      AND ft.id NOT IN (SELECT reconciled_with FROM bank_transactions WHERE reconciled = true AND reconciled_with IS NOT NULL)
    LIMIT 1;

    IF v_ft_id IS NOT NULL THEN
      UPDATE bank_transactions SET reconciled = true, reconciled_with = v_ft_id WHERE id = v_bt.id;
      v_matched := v_matched + 1;
    END IF;
  END LOOP;

  RETURN json_build_object('success', true, 'matched', v_matched);
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_company_users_updated_at BEFORE UPDATE ON public.company_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_reports_updated_at BEFORE UPDATE ON public.tax_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
