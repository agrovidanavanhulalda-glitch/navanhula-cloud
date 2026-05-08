-- Fix is_ceo function to use user_roles table
CREATE OR REPLACE FUNCTION public.is_ceo()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.id = auth.uid() 
    AND (p.is_super_admin = true OR ur.role = 'ceo' OR ur.role = 'CEO')
  );
END;
$function$;

-- Ensure product_stock has RLS enabled
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

-- Drop problematic or restrictive policies
DROP POLICY IF EXISTS "Users can view stock for their store" ON public.product_stock;
DROP POLICY IF EXISTS "Company users manage stock" ON public.product_stock;

-- Create more robust policies for product_stock
CREATE POLICY "Users can view stock of their company"
ON public.product_stock
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    JOIN public.profiles p ON s.company_id = p.company_id
    WHERE s.id = product_stock.store_id
    AND p.id = auth.uid()
  )
  OR is_ceo()
);

CREATE POLICY "Users can manage stock of their company"
ON public.product_stock
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    JOIN public.profiles p ON s.company_id = p.company_id
    WHERE s.id = product_stock.store_id
    AND p.id = auth.uid()
    AND (is_manager_or_admin(auth.uid()) OR is_ceo())
  )
  OR is_ceo()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    JOIN public.profiles p ON s.company_id = p.company_id
    WHERE s.id = product_stock.store_id
    AND p.id = auth.uid()
    AND (is_manager_or_admin(auth.uid()) OR is_ceo())
  )
  OR is_ceo()
);
