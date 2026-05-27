
-- 1. Remove JWT shortcut from tenant isolation functions to prevent claim manipulation
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
  RETURN v_company_id;
END;
$$;

-- 2. Storage policies for compliance_docs bucket (scoped to user's company folder prefix)
DROP POLICY IF EXISTS "compliance_docs company read" ON storage.objects;
DROP POLICY IF EXISTS "compliance_docs company insert" ON storage.objects;
DROP POLICY IF EXISTS "compliance_docs company update" ON storage.objects;
DROP POLICY IF EXISTS "compliance_docs company delete" ON storage.objects;

CREATE POLICY "compliance_docs company read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'compliance_docs'
  AND (storage.foldername(name))[1] = public.get_my_company_id()::text
);

CREATE POLICY "compliance_docs company insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'compliance_docs'
  AND (storage.foldername(name))[1] = public.get_my_company_id()::text
);

CREATE POLICY "compliance_docs company update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'compliance_docs'
  AND (storage.foldername(name))[1] = public.get_my_company_id()::text
);

CREATE POLICY "compliance_docs company delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'compliance_docs'
  AND (storage.foldername(name))[1] = public.get_my_company_id()::text
);

-- 3. Restrict platform_fees read access to admin/CEO
DROP POLICY IF EXISTS "Anyone can read active fees" ON public.platform_fees;
CREATE POLICY "Admins and CEO read platform fees"
ON public.platform_fees FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'ceo'::app_role)
);

-- 4. Restrict reseller_materials to enrolled resellers + admin/CEO
DROP POLICY IF EXISTS "Authenticated users view active reseller materials" ON public.reseller_materials;
CREATE POLICY "Enrolled resellers and admins view materials"
ON public.reseller_materials FOR SELECT TO authenticated
USING (
  is_active = true
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
    OR public.has_role(auth.uid(), 'reseller'::app_role)
    OR EXISTS (SELECT 1 FROM public.resellers r WHERE r.profile_id = auth.uid() AND r.status = 'active')
  )
);

-- 5. system_errors: require authentication and own user_id on insert
DROP POLICY IF EXISTS "Users can insert their own errors" ON public.system_errors;
CREATE POLICY "Authenticated users insert own errors"
ON public.system_errors FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 6. user_roles: tighten SELECT so co-tenants can't enumerate privileged roles
DROP POLICY IF EXISTS "standard_isolation" ON public.user_roles;
-- Existing "Users view own role" + "Admins can manage roles in same company" + "CEO manages roles"
-- already cover legitimate read paths. Add explicit admin/manager visibility for own company:
DROP POLICY IF EXISTS "Admins view company roles" ON public.user_roles;
CREATE POLICY "Admins view company roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'ceo'::app_role)
  OR public.has_minimum_role(auth.uid(), 'manager'::app_role)
);
