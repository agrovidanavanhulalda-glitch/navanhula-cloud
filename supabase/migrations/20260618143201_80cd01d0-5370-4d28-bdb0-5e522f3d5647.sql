
-- Aggregate permission keys for a user (deduplicated, respecting overrides)
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH role_perms AS (
    SELECT DISTINCT p.key
    FROM public.user_roles ur
    JOIN public.roles r ON r.key = ur.role::text
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
  ),
  granted AS (
    SELECT DISTINCT p.key
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id AND up.granted = true
  ),
  revoked AS (
    SELECT DISTINCT p.key
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id AND up.granted = false
      AND up.company_id IS NULL AND up.branch_id IS NULL AND up.department_id IS NULL
  ),
  base AS (
    SELECT key FROM role_perms
    UNION
    SELECT key FROM granted
  )
  SELECT COALESCE(array_agg(b.key), ARRAY[]::text[])
  FROM base b
  WHERE b.key NOT IN (SELECT key FROM revoked)
     OR public.is_master_owner(_user_id)
     OR EXISTS (
       SELECT 1 FROM public.user_roles ur
       JOIN public.roles r ON r.key = ur.role::text
       WHERE ur.user_id = _user_id AND r.key IN ('owner','admin')
     );
$$;
REVOKE ALL ON FUNCTION public.get_user_permissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated, service_role;

-- Aggregated app context (single round-trip on login)
CREATE OR REPLACE FUNCTION public.get_user_app_context(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
  v_company jsonb;
  v_branch jsonb;
  v_tenant jsonb;
  v_roles text[];
  v_perms text[];
  v_branch_id uuid;
  v_company_id uuid;
BEGIN
  SELECT to_jsonb(p.*) INTO v_profile
  FROM public.profiles p WHERE p.id = _user_id;

  v_company_id := (v_profile->>'company_id')::uuid;
  v_branch_id  := (v_profile->>'branch_id')::uuid;

  IF v_company_id IS NOT NULL THEN
    SELECT to_jsonb(c.*) INTO v_company FROM public.companies c WHERE c.id = v_company_id;
    SELECT to_jsonb(t.*) INTO v_tenant FROM public.tenants t
      WHERE t.id = (v_company->>'tenant_id')::uuid;
  END IF;

  IF v_branch_id IS NOT NULL THEN
    SELECT to_jsonb(b.*) INTO v_branch FROM public.branches b WHERE b.id = v_branch_id;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT ur.role::text), ARRAY[]::text[])
    INTO v_roles
  FROM public.user_roles ur WHERE ur.user_id = _user_id;

  v_perms := public.get_user_permissions(_user_id);

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'profile', v_profile,
    'company', v_company,
    'branch', v_branch,
    'tenant', v_tenant,
    'roles', v_roles,
    'permissions', v_perms,
    'is_master', public.is_master_owner(_user_id),
    'session_ready', true
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_user_app_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_app_context(uuid) TO authenticated, service_role;
