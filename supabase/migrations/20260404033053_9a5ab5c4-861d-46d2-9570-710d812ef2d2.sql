
-- Scheduled payments table
CREATE TABLE public.scheduled_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  destination_phone TEXT,
  destination_info TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  category TEXT NOT NULL DEFAULT 'supplier', -- supplier, tax, salary, other
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduled payments for their company"
  ON public.scheduled_payments FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create scheduled payments for their company"
  ON public.scheduled_payments FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update scheduled payments for their company"
  ON public.scheduled_payments FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete scheduled payments for their company"
  ON public.scheduled_payments FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
