-- Fix products policy to be more inclusive
DROP POLICY IF EXISTS "Company users view products" ON public.products;
DROP POLICY IF EXISTS "Users view company products" ON public.products;

CREATE POLICY "Users can view products of their company"
ON public.products
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
  OR is_ceo()
);

-- Fix stock_alerts policies
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view alerts" ON public.stock_alerts;

CREATE POLICY "Users can view alerts of their company"
ON public.stock_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.profiles pr ON p.company_id = pr.company_id
    WHERE p.id = stock_alerts.product_id
    AND pr.id = auth.uid()
  )
  OR is_ceo()
);

-- Fix stock_movements for better coverage
DROP POLICY IF EXISTS "Users can view stock movements of their company" ON public.stock_movements;

CREATE POLICY "Users can view stock movements of their company"
ON public.stock_movements
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
  OR is_ceo()
);
