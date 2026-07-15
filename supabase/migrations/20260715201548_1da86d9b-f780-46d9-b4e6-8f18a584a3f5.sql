
-- =====================================================================
-- SPRINT 5.2.1-RLS — Enterprise Security Patch (multi-tenant isolation)
-- Additive & reversible. No data mutations. RLS-only.
-- =====================================================================

-- 1) Helper: CEO scoped to a specific company ------------------------------
CREATE OR REPLACE FUNCTION public.is_ceo_of(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.role = 'ceo' OR ur.role::text = 'CEO')
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
          AND cu.company_id = _company_id
          AND cu.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.company_id = _company_id
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_ceo_of(uuid) TO authenticated, service_role;

-- 2) CATEGORIES — remove unscoped is_ceo() bypass -------------------------
DROP POLICY IF EXISTS "Company users manage categories" ON public.categories;
DROP POLICY IF EXISTS "Company users view categories"   ON public.categories;

CREATE POLICY "Company users view categories"
ON public.categories
FOR SELECT
TO authenticated
USING (
  company_id IS NULL
  OR company_id = public.get_my_company_id()
  OR public.is_ceo_of(company_id)
  OR public.is_founder(auth.uid())
);

CREATE POLICY "Company users manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (
  company_id = public.get_my_company_id()
  OR public.is_ceo_of(company_id)
  OR public.is_founder(auth.uid())
)
WITH CHECK (
  company_id = public.get_my_company_id()
  OR public.is_ceo_of(company_id)
  OR public.is_founder(auth.uid())
);

-- 3) COMPANIES — scope CEO branch on "Users view own company" -------------
DROP POLICY IF EXISTS "Users view own company" ON public.companies;

CREATE POLICY "Users view own company"
ON public.companies
FOR SELECT
TO authenticated
USING (
  id = public.get_my_company_id()
  OR public.is_ceo_of(id)
  OR public.is_founder(auth.uid())
);

-- 4) PRICE_HISTORY — enforce company_id scope -----------------------------
DROP POLICY IF EXISTS "Managers and admins can view price history"   ON public.price_history;
DROP POLICY IF EXISTS "Managers and admins can insert price history" ON public.price_history;

CREATE POLICY "Managers and admins view price history in own company"
ON public.price_history
FOR SELECT
TO authenticated
USING (
  public.is_manager_or_admin(auth.uid())
  AND company_id = public.get_user_company(auth.uid())
);

CREATE POLICY "Managers and admins insert price history in own company"
ON public.price_history
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager_or_admin(auth.uid())
  AND company_id = public.get_user_company(auth.uid())
);

-- 5) COMMISSIONS — scope INSERT WITH CHECK to caller's company ------------
DROP POLICY IF EXISTS "System inserts commissions" ON public.commissions;

CREATE POLICY "System inserts commissions in own company"
ON public.commissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager_or_admin(auth.uid())
  AND company_id = public.get_user_company(auth.uid())
);

-- 6) RESELLER_MATERIALS — scope reads to caller's company -----------------
DROP POLICY IF EXISTS "Enrolled resellers and admins view materials" ON public.reseller_materials;

CREATE POLICY "Enrolled resellers and admins view materials in own company"
ON public.reseller_materials
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    company_id IS NULL
    OR company_id = public.get_user_company(auth.uid())
  )
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_ceo_of(company_id)
    OR EXISTS (
      SELECT 1 FROM public.resellers r
      WHERE r.profile_id = auth.uid()
        AND r.status = 'active'::reseller_status
        AND (r.company_id = reseller_materials.company_id OR reseller_materials.company_id IS NULL)
    )
  )
);
