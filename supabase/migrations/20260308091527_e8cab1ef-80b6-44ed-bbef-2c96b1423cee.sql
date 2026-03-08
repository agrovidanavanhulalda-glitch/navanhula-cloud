
-- Expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  category text NOT NULL DEFAULT 'outros',
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  receipt_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));

-- Accounts Payable
CREATE TABLE public.accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pendente',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company AP" ON public.accounts_payable
  FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers manage AP" ON public.accounts_payable
  FOR ALL TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));

-- Accounts Receivable
CREATE TABLE public.accounts_receivable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  customer_name text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  document_ref text,
  due_date date NOT NULL,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pendente',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company AR" ON public.accounts_receivable
  FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers manage AR" ON public.accounts_receivable
  FOR ALL TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()))
  WITH CHECK (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));

-- Auto-record expenses into accounting_entries
CREATE OR REPLACE FUNCTION public.auto_accounting_entry_on_expense()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO accounting_entries (company_id, store_id, type, category, amount, description, reference_id, reference_type, created_by)
  VALUES (NEW.company_id, NEW.store_id, 'expense', NEW.category, NEW.amount, NEW.description, NEW.id, 'expense', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_to_accounting
  AFTER INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.auto_accounting_entry_on_expense();

-- Auto-record AP payment into accounting_entries
CREATE OR REPLACE FUNCTION public.auto_accounting_entry_on_ap_payment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') THEN
    INSERT INTO accounting_entries (company_id, store_id, type, category, amount, description, reference_id, reference_type, created_by)
    VALUES (NEW.company_id, NEW.store_id, 'expense', 'accounts_payable', NEW.amount, 'Pgto: ' || NEW.description, NEW.id, 'accounts_payable', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ap_payment_to_accounting
  AFTER UPDATE ON public.accounts_payable
  FOR EACH ROW EXECUTE FUNCTION public.auto_accounting_entry_on_ap_payment();

-- Auto-record AR payment into accounting_entries
CREATE OR REPLACE FUNCTION public.auto_accounting_entry_on_ar_payment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') THEN
    INSERT INTO accounting_entries (company_id, store_id, type, category, amount, description, reference_id, reference_type, created_by)
    VALUES (NEW.company_id, NEW.store_id, 'revenue', 'accounts_receivable', NEW.amount, 'Recebimento: ' || NEW.description, NEW.id, 'accounts_receivable', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ar_payment_to_accounting
  AFTER UPDATE ON public.accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.auto_accounting_entry_on_ar_payment();
