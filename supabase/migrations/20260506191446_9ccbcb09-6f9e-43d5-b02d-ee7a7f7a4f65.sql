-- 1. user_roles: restringir admin para mesma empresa
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles in same company"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
      AND p.company_id = public.get_user_company(auth.uid())
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
      AND p.company_id = public.get_user_company(auth.uid())
  )
);

-- 2. Drop any over-permissive payment-proofs upload policies (defensive)
DROP POLICY IF EXISTS "Authenticated users can upload proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
