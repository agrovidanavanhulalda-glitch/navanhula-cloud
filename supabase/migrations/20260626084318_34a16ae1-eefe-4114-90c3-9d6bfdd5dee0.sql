
CREATE OR REPLACE FUNCTION public.view_team_members(
  p_company_id uuid,
  p_branch_id uuid DEFAULT NULL,
  p_permission text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role_label text,
  branch_id uuid,
  branch_name text,
  is_active boolean,
  has_permission boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      cu.user_id,
      coalesce(p.full_name, p.email, 'Operador') AS full_name,
      p.email,
      cu.role AS role_label,
      coalesce(cu.branch_id, p.branch_id) AS branch_id,
      b.name AS branch_name,
      coalesce(cu.status, 'active') = 'active' AND coalesce(p.is_active, true) AS is_active
    FROM public.company_users cu
    LEFT JOIN public.profiles p ON p.id = cu.user_id
    LEFT JOIN public.branches b ON b.id = coalesce(cu.branch_id, p.branch_id)
    WHERE cu.company_id = p_company_id
      AND (p_branch_id IS NULL OR coalesce(cu.branch_id, p.branch_id) IS NULL OR coalesce(cu.branch_id, p.branch_id) = p_branch_id)
  )
  SELECT
    b.user_id,
    b.full_name,
    b.email,
    b.role_label,
    b.branch_id,
    b.branch_name,
    b.is_active,
    CASE
      WHEN p_permission IS NULL THEN true
      ELSE public.user_has_permission(b.user_id, p_permission, p_company_id, b.branch_id, NULL)
    END AS has_permission
  FROM base b
  WHERE p_permission IS NULL
     OR public.user_has_permission(b.user_id, p_permission, p_company_id, b.branch_id, NULL) = true
  ORDER BY b.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.view_team_members(uuid, uuid, text) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_company_users_company_active
  ON public.company_users(company_id) WHERE status = 'active';
