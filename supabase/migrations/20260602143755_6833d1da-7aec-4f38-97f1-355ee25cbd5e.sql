
-- ============================================
-- 1. Fix is_master_owner() to not trust user_metadata
-- ============================================
CREATE OR REPLACE FUNCTION public.is_master_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$function$;

-- ============================================
-- 2. Fix has_min_role() to NOT trust JWT user_metadata
-- ============================================
CREATE OR REPLACE FUNCTION public.has_min_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_role text;
BEGIN
  IF public.is_master_owner() THEN RETURN TRUE; END IF;

  -- Source role ONLY from server-side tables (never from JWT metadata)
  SELECT role INTO v_user_role FROM public.company_users
  WHERE user_id = auth.uid() AND company_id = public.get_my_company() LIMIT 1;

  IF v_user_role IS NULL THEN RETURN FALSE; END IF;

  CASE lower(required_role)
    WHEN 'viewer' THEN RETURN TRUE;
    WHEN 'seller' THEN RETURN v_user_role IN ('seller', 'manager', 'admin', 'owner', 'ceo', 'master');
    WHEN 'manager' THEN RETURN v_user_role IN ('manager', 'admin', 'owner', 'ceo', 'master');
    WHEN 'admin' THEN RETURN v_user_role IN ('admin', 'owner', 'ceo', 'master');
    WHEN 'owner' THEN RETURN v_user_role IN ('owner', 'ceo', 'master');
    WHEN 'ceo' THEN RETURN v_user_role IN ('ceo', 'master');
    ELSE RETURN v_user_role = 'master';
  END CASE;
END;
$function$;

-- ============================================
-- 3. Fix user_roles SELECT policy to scope by company
-- ============================================
DROP POLICY IF EXISTS "Admins view company roles" ON public.user_roles;

CREATE POLICY "Admins view company roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  -- Master owner sees all
  public.is_master_owner()
  OR
  -- Otherwise, admin/manager/ceo can only see users in their own company
  (
    (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'::app_role) OR public.has_minimum_role(auth.uid(), 'manager'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.company_id = public.get_user_company(auth.uid())
    )
  )
);

-- ============================================
-- 4. Fix company_assets bucket: enforce folder ownership on INSERT
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;

CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company_assets'
  AND (storage.foldername(name))[1] = (public.get_user_company(auth.uid()))::text
);
