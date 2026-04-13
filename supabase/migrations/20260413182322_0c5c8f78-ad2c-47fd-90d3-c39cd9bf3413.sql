
-- Create financial_transactions table
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL DEFAULT 'others',
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  payment_method TEXT DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own company transactions"
ON public.financial_transactions FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users create own company transactions"
ON public.financial_transactions FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users update own company transactions"
ON public.financial_transactions FOR UPDATE TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users delete own company transactions"
ON public.financial_transactions FOR DELETE TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

-- Indexes
CREATE INDEX idx_financial_transactions_company ON public.financial_transactions(company_id);
CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type, status);

-- Updated_at trigger
CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-insert financial transaction on sale completion
CREATE OR REPLACE FUNCTION public.auto_financial_tx_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT company_id INTO v_company_id FROM stores WHERE id = NEW.store_id;
    IF v_company_id IS NOT NULL THEN
      INSERT INTO financial_transactions (company_id, store_id, type, category, amount, description, reference_id, reference_type, payment_method, status, transaction_date, created_by)
      VALUES (v_company_id, NEW.store_id, 'income', 'sales', NEW.total, 'Venda #' || LEFT(NEW.id::text, 8), NEW.id, 'sale', COALESCE(NEW.payment_method, 'cash'), 'paid', NEW.created_at::date, NEW.seller_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_financial_tx_on_sale
AFTER INSERT OR UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.auto_financial_tx_on_sale();

-- Auto-insert financial transaction on expense
CREATE OR REPLACE FUNCTION public.auto_financial_tx_on_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO financial_transactions (company_id, store_id, type, category, amount, description, reference_id, reference_type, status, transaction_date, created_by)
  VALUES (NEW.company_id, NEW.store_id, 'expense', NEW.category, NEW.amount, NEW.description, NEW.id, 'expense', 'paid', NEW.expense_date::date, NEW.created_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_financial_tx_on_expense
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.auto_financial_tx_on_expense();
