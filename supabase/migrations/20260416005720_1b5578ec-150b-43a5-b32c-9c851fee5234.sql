
-- Fix audit_logs INSERT policy
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Handle orphan compliance_docs bucket
UPDATE storage.buckets SET public = false WHERE id = 'compliance_docs';

-- NEW TABLE: warehouses
CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  name text NOT NULL,
  code text,
  address text,
  capacity numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view warehouses"
ON public.warehouses FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage warehouses"
ON public.warehouses FOR ALL TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
);

-- NEW TABLE: cost_centers
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  budget numeric DEFAULT 0,
  spent numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view cost centers"
ON public.cost_centers FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can manage cost centers"
ON public.cost_centers FOR ALL TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'manager'))
);

-- Add cost_center_id to financial_transactions
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id);

-- Add warehouse_id to product_stock and stock_movements
ALTER TABLE public.product_stock ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id);
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id);
