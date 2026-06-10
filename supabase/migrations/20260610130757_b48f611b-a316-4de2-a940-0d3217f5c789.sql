
-- profiles_update: block is_super_admin escalation in WITH CHECK
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
FOR UPDATE TO authenticated
USING (
  company_id = public.current_company_id()
  AND (id = auth.uid() OR public.is_admin_or_manager())
)
WITH CHECK (
  company_id = public.current_company_id()
  AND (id = auth.uid() OR public.is_admin_or_manager())
  AND is_super_admin IS NOT DISTINCT FROM false
);

-- user_roles SELECT: scope CEO branch
DROP POLICY IF EXISTS "Users view own role" ON public.user_roles;
CREATE POLICY "Users view own role"
ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (public.has_role(auth.uid(),'ceo') AND company_id = public.get_user_company(auth.uid()))
);

-- leads: drop unscoped admin policies (company-scoped policies already exist)
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
