
CREATE OR REPLACE FUNCTION public.is_global_ceo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'ceo'
  );
$$;

DROP POLICY IF EXISTS "Authenticated users can upload community media" ON storage.objects;
CREATE POLICY "Users can upload to own community media folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comunidade_media'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Managers can update vouchers" ON public.payment_vouchers;
CREATE POLICY "Managers can update vouchers in own company"
ON public.payment_vouchers FOR UPDATE TO authenticated
USING (public.is_manager_or_admin(auth.uid()) AND company_id = public.get_user_company(auth.uid()))
WITH CHECK (public.is_manager_or_admin(auth.uid()) AND company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Managers and admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Managers manage company categories" ON public.categories;

DROP POLICY IF EXISTS "Admins manage commissions" ON public.commissions;
CREATE POLICY "Admins manage commissions in own company"
ON public.commissions FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) AND company_id = public.get_user_company(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) AND company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Admins manage all customer links" ON public.customer_sellers;
CREATE POLICY "Admins manage customer links in own company"
ON public.customer_sellers FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) AND company_id = public.get_user_company(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) AND company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS "Admins manage resellers" ON public.resellers;
CREATE POLICY "Admins manage resellers in own company"
ON public.resellers FOR ALL TO authenticated
USING ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo')) AND company_id = public.get_user_company(auth.uid()))
WITH CHECK ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo')) AND company_id = public.get_user_company(auth.uid()));
