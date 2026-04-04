
-- Fix 1: Restrict payment_vouchers SELECT to user's own store
DROP POLICY IF EXISTS "Users can view vouchers" ON public.payment_vouchers;
CREATE POLICY "Users can view vouchers from own store"
  ON public.payment_vouchers
  FOR SELECT
  TO authenticated
  USING (store_id = get_user_store(auth.uid()));

-- Fix 2: Restrict sale_items INSERT to sales belonging to user's store
DROP POLICY IF EXISTS "Users can insert sale items" ON public.sale_items;
CREATE POLICY "Users can insert sale items for own store sales"
  ON public.sale_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
        AND s.store_id = get_user_store(auth.uid())
    )
  );
