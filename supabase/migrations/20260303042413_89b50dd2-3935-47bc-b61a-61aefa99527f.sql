
-- Fix overly permissive INSERT policy - restrict to managers/admins or service role
DROP POLICY "Authenticated users can insert vouchers" ON public.payment_vouchers;
CREATE POLICY "Managers can insert vouchers"
  ON public.payment_vouchers FOR INSERT
  TO authenticated
  WITH CHECK (is_manager_or_admin(auth.uid()));

-- Fix overly permissive UPDATE policy - only allow via the RPC function (SECURITY DEFINER)
DROP POLICY "Authenticated users can update vouchers" ON public.payment_vouchers;
CREATE POLICY "Managers can update vouchers"
  ON public.payment_vouchers FOR UPDATE
  TO authenticated
  USING (is_manager_or_admin(auth.uid()));
