
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.company_invitations;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_invitation_by_token' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated';
  END IF;
END $$;

DROP POLICY IF EXISTS "Role Permissions read-only" ON public.role_permissions;
CREATE POLICY "Role permissions admin/CEO read"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'ceo'::app_role)
);

DROP POLICY IF EXISTS "Allow profile insertion during signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
DROP POLICY IF EXISTS "Permitir inserção de novos perfis por usuários autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert during signup" ON public.profiles;
CREATE POLICY "Users insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Permitir vinculação de utilizadores por usuários autenticado" ON public.user_company;

DROP POLICY IF EXISTS "Users can view audit items" ON public.inventory_audit_items;
CREATE POLICY "Authenticated users view audit items in their company"
ON public.inventory_audit_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inventory_audits ia
    WHERE ia.id = inventory_audit_items.audit_id
      AND ia.company_id = public.get_user_company(auth.uid())
  )
);
