
-- Table for automated tax calculations per period
CREATE TABLE public.tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  tax_type TEXT NOT NULL, -- 'iva', 'irpc', 'inss_employee', 'inss_employer'
  base_amount NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company tax calculations"
  ON public.tax_calculations FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage tax calculations"
  ON public.tax_calculations FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo')))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo')));

-- Table for financial health score
CREATE TABLE public.financial_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  expenses NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  taxes_paid_on_time INTEGER NOT NULL DEFAULT 0,
  taxes_total INTEGER NOT NULL DEFAULT 0,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, period_month, period_year)
);

ALTER TABLE public.financial_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company financial scores"
  ON public.financial_scores FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage financial scores"
  ON public.financial_scores FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo')))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo')));
