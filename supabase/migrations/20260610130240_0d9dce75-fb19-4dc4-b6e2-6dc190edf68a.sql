
-- Fix cross-tenant data leaks and missing tenant scope on writes

-- 1. system_audit_logs: drop the unscoped overriding policy
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.system_audit_logs;

-- 2. auth_event_logs: scope to caller's company
DROP POLICY IF EXISTS "Admins can view all auth event logs" ON public.auth_event_logs;
CREATE POLICY "Admins can view auth event logs in own company"
ON public.auth_event_logs FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ceo'))
);

-- 3. payment_vouchers INSERT: enforce company match
DROP POLICY IF EXISTS "Managers can insert vouchers" ON public.payment_vouchers;
CREATE POLICY "Managers can insert vouchers"
ON public.payment_vouchers FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager_or_admin(auth.uid())
  AND company_id = public.get_user_company(auth.uid())
);

-- 4. stock_adjustments INSERT: enforce company match
DROP POLICY IF EXISTS "Managers and admins can create adjustments" ON public.stock_adjustments;
CREATE POLICY "Managers and admins can create adjustments"
ON public.stock_adjustments FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager_or_admin(auth.uid())
  AND company_id = public.get_user_company(auth.uid())
);

-- 5. stock_adjustments SELECT: scope admin branch to own company
DROP POLICY IF EXISTS "Managers can view adjustments for their store" ON public.stock_adjustments;
CREATE POLICY "Managers can view adjustments for their store"
ON public.stock_adjustments FOR SELECT
TO authenticated
USING (
  store_id = public.get_user_store(auth.uid())
  OR (public.is_admin(auth.uid()) AND company_id = public.get_user_company(auth.uid()))
);

-- 6. role_permissions_legacy: scope all four policies by company
DROP POLICY IF EXISTS "Admins can read permissions" ON public.role_permissions_legacy;
DROP POLICY IF EXISTS "CEO and Admin can manage permissions" ON public.role_permissions_legacy;
DROP POLICY IF EXISTS "CEO and Admin can update permissions" ON public.role_permissions_legacy;
DROP POLICY IF EXISTS "CEO and Admin can delete permissions" ON public.role_permissions_legacy;

CREATE POLICY "Admins can read permissions in own company"
ON public.role_permissions_legacy FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ceo'))
  AND (company_id IS NULL OR company_id = public.get_user_company(auth.uid()))
);

CREATE POLICY "CEO and Admin can insert permissions in own company"
ON public.role_permissions_legacy FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ceo'))
  AND (company_id IS NULL OR company_id = public.get_user_company(auth.uid()))
);

CREATE POLICY "CEO and Admin can update permissions in own company"
ON public.role_permissions_legacy FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ceo'))
  AND (company_id IS NULL OR company_id = public.get_user_company(auth.uid()))
)
WITH CHECK (
  (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ceo'))
  AND (company_id IS NULL OR company_id = public.get_user_company(auth.uid()))
);

CREATE POLICY "CEO and Admin can delete permissions in own company"
ON public.role_permissions_legacy FOR DELETE
TO authenticated
USING (
  (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ceo'))
  AND (company_id IS NULL OR company_id = public.get_user_company(auth.uid()))
);

-- 7. platform_fees: scope SELECT to own company (or global fees)
DROP POLICY IF EXISTS "Admins and CEO read platform fees" ON public.platform_fees;
CREATE POLICY "Admins and CEO read platform fees in own company"
ON public.platform_fees FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ceo'))
  AND (company_id IS NULL OR company_id = public.get_user_company(auth.uid()))
);

-- 8. storage.objects comunidade_media: restrict SELECT to user's own folder OR company folder
DROP POLICY IF EXISTS "Authenticated users can read community media" ON storage.objects;
CREATE POLICY "Users can read own community media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comunidade_media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
  )
);
