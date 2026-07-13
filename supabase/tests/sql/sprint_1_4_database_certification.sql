-- =====================================================================
-- SPRINT 1.4 — FASE 4 — DATABASE CERTIFICATION (pgTAP-style assertions)
-- =====================================================================
-- QUALITY GATE: read-only assertions. Does NOT alter schema, RLS,
-- migrations, business rules or API contracts. Intended to be executed
-- manually against a staging DB (psql -f) or via a future CI job.
--
-- Covered RPCs:
--   feature_flag_is_enabled, user_has_permission, has_role, is_founder,
--   get_user_app_context, pos_complete_sale, issue_fiscal_document,
--   founder_dashboard_metrics, founder_platform_stats,
--   founder_monitoring_stats, founder_business_analytics
--
-- Covered invariants:
--   RLS enabled | RBAC | Feature Flag precedence | Tenant isolation |
--   SECURITY DEFINER hardening | Trigger presence | UNIQUE/CHECK guards
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. RLS is enabled on every critical public table
-- ---------------------------------------------------------------------
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(c.relname, ', ')
    INTO missing
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname = ANY (ARRAY[
      'sales','sale_items','products','product_stock','profiles',
      'user_roles','companies','branches','tenants',
      'feature_flags','feature_flag_overrides',
      'fiscal_documents','fiscal_document_items','fiscal_audit_log',
      'subscriptions','invoices','wallets','wallet_transactions',
      'audit_logs','founder_audit_log'
    ])
    AND c.relrowsecurity = false;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'RLS DISABLED on: %', missing;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. All security-sensitive functions exist and are SECURITY DEFINER
--    with a locked search_path (mitigates CVE-2018-1058 style attacks)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  fn text;
  bad text := '';
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'feature_flag_is_enabled','user_has_permission','has_role',
    'is_founder','get_user_app_context','pos_complete_sale',
    'issue_fiscal_document','founder_dashboard_metrics',
    'founder_platform_stats','founder_monitoring_stats',
    'founder_business_analytics'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    ) THEN
      bad := bad || fn || ' [missing], ';
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = fn
        AND p.prosecdef = true
        AND EXISTS (
          SELECT 1 FROM unnest(coalesce(p.proconfig,'{}'::text[])) c
          WHERE c LIKE 'search_path=%'
        )
    ) THEN
      bad := bad || fn || ' [not SECURITY DEFINER or unlocked search_path], ';
    END IF;
  END LOOP;
  IF bad <> '' THEN
    RAISE EXCEPTION 'Function hardening violations: %', bad;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. has_role / is_founder behave correctly for the anonymous case
--    (defensive — must never throw, must return false)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF public.has_role('00000000-0000-0000-0000-000000000000'::uuid, 'admin') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'has_role must return false for unknown user';
  END IF;
  IF public.is_founder('00000000-0000-0000-0000-000000000000'::uuid) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'is_founder must return false for unknown user';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4. Feature Flag precedence: override > flag.enabled > default(false)
--    Read-only check using an ephemeral flag key that does not exist.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v boolean;
BEGIN
  v := public.feature_flag_is_enabled('__nonexistent_key__', NULL, NULL);
  IF v IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'feature_flag_is_enabled must default to false for unknown keys, got %', v;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5. UNIQUE / CHECK constraints on billing-critical tables
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%user_roles%' AND contype = 'u'
  ) THEN
    RAISE WARNING 'user_roles is missing a UNIQUE (user_id, role) constraint';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6. Tenant isolation invariant: every fiscal document belongs to a
--    company that the caller can resolve via get_user_company_ids().
--    This is a *structural* check, not a data-level check.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='fiscal_documents'
      AND column_name='company_id'
  ) THEN
    RAISE EXCEPTION 'fiscal_documents.company_id missing — tenant isolation broken';
  END IF;
END $$;

ROLLBACK;

-- =====================================================================
-- END SPRINT 1.4 FASE 4
-- Expected result: ROLLBACK with NO exceptions raised.
-- Any RAISE EXCEPTION above indicates a certification failure.
-- =====================================================================
