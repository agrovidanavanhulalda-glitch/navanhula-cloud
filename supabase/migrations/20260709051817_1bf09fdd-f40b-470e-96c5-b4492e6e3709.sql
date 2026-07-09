
-- ============================================================
-- FOUNDER CONTROL CENTER — Marco 1 (Fundação)
-- ============================================================

-- Ensure is_founder helper exists (from Phase 1). Re-create defensively.
CREATE OR REPLACE FUNCTION public.is_founder(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (is_founder IS TRUE) OR (account_type = 'FOUNDER')
     FROM public.profiles
     WHERE id = _user_id),
    false
  );
$$;

-- ------------------------------------------------------------
-- feature_flags
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_read_all" ON public.feature_flags;
CREATE POLICY "feature_flags_read_all"
  ON public.feature_flags FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "feature_flags_founder_write" ON public.feature_flags;
CREATE POLICY "feature_flags_founder_write"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (public.is_founder(auth.uid()))
  WITH CHECK (public.is_founder(auth.uid()));

-- Seed default flags
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('pos',         true,  'Módulo POS / Ponto de Venda'),
  ('erp',         true,  'Módulo ERP'),
  ('crm',         true,  'Módulo CRM'),
  ('hr',          true,  'Módulo Recursos Humanos'),
  ('finance',     true,  'Módulo Financeiro'),
  ('fiscal',      true,  'Módulo Fiscal'),
  ('ecommerce',   true,  'Loja Online'),
  ('marketplace', true,  'Marketplace'),
  ('ai',          true,  'Módulos com IA'),
  ('public_api',  true,  'API Pública'),
  ('developer_mode', false, 'Modo Desenvolvedor (debug avançado)')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- founder_audit_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.founder_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.founder_audit_log TO authenticated;
GRANT ALL ON public.founder_audit_log TO service_role;

ALTER TABLE public.founder_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founder_audit_founder_only" ON public.founder_audit_log;
CREATE POLICY "founder_audit_founder_only"
  ON public.founder_audit_log FOR ALL
  TO authenticated
  USING (public.is_founder(auth.uid()))
  WITH CHECK (public.is_founder(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_founder_audit_created ON public.founder_audit_log (created_at DESC);

-- ------------------------------------------------------------
-- Platform stats RPC (founder-only)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.founder_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: founder only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'companies_total',    (SELECT count(*) FROM public.companies),
    'companies_active',   (SELECT count(*) FROM public.companies WHERE COALESCE(status,'active') = 'active'),
    'companies_blocked',  (SELECT count(*) FROM public.companies WHERE status = 'blocked' OR status = 'suspended'),
    'stores_total',       (SELECT count(*) FROM public.stores),
    'branches_total',     (SELECT count(*) FROM public.branches),
    'users_total',        (SELECT count(*) FROM public.profiles),
    'customers_total',    (SELECT count(*) FROM public.customers),
    'subscriptions_total',(SELECT count(*) FROM public.subscriptions),
    'subscriptions_active',(SELECT count(*) FROM public.subscriptions WHERE status = 'active'),
    'trials_active',      (SELECT count(*) FROM public.subscriptions WHERE status = 'trialing' OR status = 'trial'),
    'trials_expired',     (SELECT count(*) FROM public.subscriptions WHERE status = 'expired' OR status = 'trial_expired'),
    'revenue_month',      COALESCE((SELECT sum(amount) FROM public.payment_transactions
                                    WHERE status = 'completed'
                                      AND created_at >= date_trunc('month', now())), 0),
    'revenue_total',      COALESCE((SELECT sum(amount) FROM public.payment_transactions
                                    WHERE status = 'completed'), 0)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_platform_stats() TO authenticated;

-- ------------------------------------------------------------
-- Infrastructure stats RPC (founder-only)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.founder_infrastructure_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: founder only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'db_size_bytes',    pg_database_size(current_database()),
    'tables_count',     (SELECT count(*) FROM information_schema.tables
                          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'),
    'views_count',      (SELECT count(*) FROM information_schema.views WHERE table_schema = 'public'),
    'functions_count',  (SELECT count(*) FROM information_schema.routines
                          WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'),
    'policies_count',   (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'),
    'triggers_count',   (SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public'),
    'buckets_count',    (SELECT count(*) FROM storage.buckets),
    'extensions_count', (SELECT count(*) FROM pg_extension)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_infrastructure_stats() TO authenticated;

-- ------------------------------------------------------------
-- Monitoring stats RPC (founder-only)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.founder_monitoring_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: founder only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'sessions_active_5m',
      COALESCE((SELECT count(*) FROM public.user_sessions
                 WHERE last_activity >= now() - interval '5 minutes'), 0),
    'users_online',
      COALESCE((SELECT count(DISTINCT user_id) FROM public.user_sessions
                 WHERE last_activity >= now() - interval '5 minutes'), 0),
    'companies_online',
      COALESCE((SELECT count(DISTINCT p.company_id)
                 FROM public.user_sessions s
                 JOIN public.profiles p ON p.id = s.user_id
                 WHERE s.last_activity >= now() - interval '5 minutes'), 0),
    'api_calls_1h',
      COALESCE((SELECT count(*) FROM public.api_request_logs
                 WHERE created_at >= now() - interval '1 hour'), 0),
    'api_errors_1h',
      COALESCE((SELECT count(*) FROM public.api_request_logs
                 WHERE created_at >= now() - interval '1 hour'
                   AND status_code >= 400), 0),
    'api_avg_latency_ms',
      COALESCE((SELECT round(avg(latency_ms))::int FROM public.api_request_logs
                 WHERE created_at >= now() - interval '1 hour'), 0)
  ) INTO result;

  RETURN result;
EXCEPTION WHEN undefined_column OR undefined_table THEN
  -- graceful degradation when optional columns/tables aren't fully populated
  RETURN jsonb_build_object(
    'sessions_active_5m', 0, 'users_online', 0, 'companies_online', 0,
    'api_calls_1h', 0, 'api_errors_1h', 0, 'api_avg_latency_ms', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_monitoring_stats() TO authenticated;

-- ------------------------------------------------------------
-- updated_at trigger for feature_flags
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_feature_flags_touch ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_touch
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
