
-- =========================================================
-- SPRINT 2.1 — SECURITY HARDENING
-- =========================================================

-- ---------- ETAPA 1: profiles anti-escalation ----------
DROP POLICY IF EXISTS profiles_update ON public.profiles;

CREATE POLICY profiles_update_self
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND is_founder     IS NOT DISTINCT FROM (SELECT p.is_founder     FROM public.profiles p WHERE p.id = auth.uid())
  AND is_super_admin IS NOT DISTINCT FROM (SELECT p.is_super_admin FROM public.profiles p WHERE p.id = auth.uid())
  AND account_type   IS NOT DISTINCT FROM (SELECT p.account_type   FROM public.profiles p WHERE p.id = auth.uid())
  AND company_id     IS NOT DISTINCT FROM (SELECT p.company_id     FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY profiles_update_founder
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_founder = true OR p.account_type = 'FOUNDER'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_founder = true OR p.account_type = 'FOUNDER'))
);

-- Audit trigger for privileged column changes
CREATE OR REPLACE FUNCTION public.audit_profile_privilege_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.is_founder     IS DISTINCT FROM OLD.is_founder)
  OR (NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin)
  OR (NEW.account_type   IS DISTINCT FROM OLD.account_type)
  OR (NEW.company_id     IS DISTINCT FROM OLD.company_id) THEN
    INSERT INTO public.founder_audit_log (actor_id, action, target_type, target_id, metadata, created_at)
    VALUES (
      auth.uid(),
      'profile_privilege_change',
      'profile',
      NEW.id,
      jsonb_build_object(
        'is_founder',     jsonb_build_object('old', OLD.is_founder,     'new', NEW.is_founder),
        'is_super_admin', jsonb_build_object('old', OLD.is_super_admin, 'new', NEW.is_super_admin),
        'account_type',   jsonb_build_object('old', OLD.account_type,   'new', NEW.account_type),
        'company_id',     jsonb_build_object('old', OLD.company_id,     'new', NEW.company_id)
      ),
      now()
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_profile_privilege ON public.profiles;
CREATE TRIGGER trg_audit_profile_privilege
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profile_privilege_change();

-- ---------- ETAPA 2: Materialized Views lockdown ----------
REVOKE ALL ON public.founder_dashboard_metrics_mv  FROM anon, authenticated;
REVOKE ALL ON public.ceo_dashboard_metrics_mv      FROM anon, authenticated;
REVOKE ALL ON public.crm_dashboard_metrics_mv      FROM anon, authenticated;
REVOKE ALL ON public.billing_dashboard_metrics_mv  FROM anon, authenticated;
REVOKE ALL ON public.inventory_dashboard_metrics_mv FROM anon, authenticated;
REVOKE ALL ON public.sales_dashboard_metrics_mv    FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_scope   text,
  p_company_id uuid DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_founder boolean;
  v_user_company uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT (p.is_founder OR p.account_type = 'FOUNDER'), p.company_id
    INTO v_is_founder, v_user_company
  FROM public.profiles p WHERE p.id = v_uid;

  -- Founder scope: only Founders
  IF p_scope = 'founder' THEN
    IF NOT COALESCE(v_is_founder, false) THEN
      RAISE EXCEPTION 'forbidden: founder scope';
    END IF;
    RETURN QUERY SELECT to_jsonb(m) FROM public.founder_dashboard_metrics_mv m;
    RETURN;
  END IF;

  -- Company-scoped views
  IF p_company_id IS NULL THEN
    p_company_id := v_user_company;
  END IF;

  IF NOT COALESCE(v_is_founder, false) AND p_company_id IS DISTINCT FROM v_user_company THEN
    RAISE EXCEPTION 'forbidden: cross-tenant access';
  END IF;

  IF p_scope = 'ceo' THEN
    RETURN QUERY SELECT to_jsonb(m) FROM public.ceo_dashboard_metrics_mv m WHERE m.company_id = p_company_id;
  ELSIF p_scope = 'crm' THEN
    RETURN QUERY SELECT to_jsonb(m) FROM public.crm_dashboard_metrics_mv m WHERE m.company_id = p_company_id;
  ELSIF p_scope = 'billing' THEN
    RETURN QUERY SELECT to_jsonb(m) FROM public.billing_dashboard_metrics_mv m WHERE m.company_id = p_company_id;
  ELSIF p_scope = 'inventory' THEN
    RETURN QUERY SELECT to_jsonb(m) FROM public.inventory_dashboard_metrics_mv m WHERE m.company_id = p_company_id;
  ELSIF p_scope = 'sales' THEN
    RETURN QUERY SELECT to_jsonb(m) FROM public.sales_dashboard_metrics_mv m WHERE m.company_id = p_company_id;
  ELSE
    RAISE EXCEPTION 'invalid scope: %', p_scope;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.get_dashboard_metrics(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(text, uuid) TO authenticated;

-- ---------- ETAPA 3: Global config (company_id IS NULL) ----------
-- role_permissions_legacy
DROP POLICY IF EXISTS "CEO and Admin can update permissions in own company" ON public.role_permissions_legacy;
DROP POLICY IF EXISTS "CEO and Admin can delete permissions in own company" ON public.role_permissions_legacy;
DROP POLICY IF EXISTS "CEO and Admin can insert permissions in own company" ON public.role_permissions_legacy;

CREATE POLICY rpl_admin_write_own_company
ON public.role_permissions_legacy
FOR ALL
TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = get_user_company(auth.uid())
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
)
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = get_user_company(auth.uid())
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role))
);

CREATE POLICY rpl_founder_write_globals
ON public.role_permissions_legacy
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_founder = true OR p.account_type = 'FOUNDER'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_founder = true OR p.account_type = 'FOUNDER'))
);

-- platform_fees: only Founder may write globals
CREATE POLICY platform_fees_founder_write
ON public.platform_fees
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_founder = true OR p.account_type = 'FOUNDER'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_founder = true OR p.account_type = 'FOUNDER'))
);

-- ---------- ETAPA 4: workflows anti-self-approval ----------
DROP POLICY IF EXISTS "Admins can manage workflows" ON public.workflows;

CREATE POLICY workflows_admin_update
ON public.workflows
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company(auth.uid())
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role) OR has_role(auth.uid(),'manager'::app_role))
)
WITH CHECK (
  company_id = get_user_company(auth.uid())
  -- Approver/rejecter must not be the requester
  AND (approved_by IS NULL OR approved_by <> requested_by)
  AND (rejected_by IS NULL OR rejected_by <> requested_by)
  -- Whoever sets approved_by/rejected_by must be the current user (no impersonation)
  AND (approved_by IS NULL OR approved_by = auth.uid())
  AND (rejected_by IS NULL OR rejected_by = auth.uid())
  -- A user cannot approve their own workflow
  AND requested_by <> auth.uid()
);

CREATE OR REPLACE FUNCTION public.audit_workflow_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status)
     AND NEW.status IN ('approved','rejected') THEN
    INSERT INTO public.founder_audit_log (actor_id, action, target_type, target_id, metadata, created_at)
    VALUES (
      auth.uid(),
      'workflow_' || NEW.status,
      'workflow',
      NEW.id,
      jsonb_build_object('requested_by', NEW.requested_by, 'company_id', NEW.company_id, 'type', NEW.workflow_type),
      now()
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_workflow_decision ON public.workflows;
CREATE TRIGGER trg_audit_workflow_decision
  AFTER UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.audit_workflow_decision();

-- ---------- ETAPA 5: Storage isolation by company path ----------
-- Path convention: {company_id}/...  (first folder = company)
DROP POLICY IF EXISTS "Public Access to Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;
DROP POLICY IF EXISTS "Product images are accessible by knowledge of path" ON storage.objects;
DROP POLICY IF EXISTS "Company assets are accessible by path" ON storage.objects;

CREATE POLICY "company_assets scoped read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('company_assets','product-images')
  AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.is_founder OR p.account_type='FOUNDER'))
    OR (storage.foldername(name))[1]::uuid = get_user_company(auth.uid())
  )
);

CREATE POLICY "company_assets public product read"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'product-images'
);

-- ---------- ETAPA 7: Revoke sensitive EXECUTE from anon ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', r.nspname, r.proname, r.args);
  END LOOP;
END $$;
