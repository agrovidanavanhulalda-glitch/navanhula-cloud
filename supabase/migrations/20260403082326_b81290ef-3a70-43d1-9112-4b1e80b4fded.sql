
-- Fix permissive INSERT policy on agro_orders
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.agro_orders;
CREATE POLICY "Authenticated users can create orders"
  ON public.agro_orders FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
