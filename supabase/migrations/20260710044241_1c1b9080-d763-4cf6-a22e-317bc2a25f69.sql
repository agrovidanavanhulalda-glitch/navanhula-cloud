
-- ============================================================
-- FOUNDER CONTROL CENTER — ENTREGA A (Backend Foundation)
-- ============================================================

-- ---------- profiles: colunas de bloqueio/logout ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS force_logout_at timestamptz;

-- ---------- platform_settings (singleton) ----------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  name text NOT NULL DEFAULT 'NAVANHULA CLOUD',
  logo_url text,
  default_language text NOT NULL DEFAULT 'pt',
  timezone text NOT NULL DEFAULT 'Africa/Maputo',
  currency text NOT NULL DEFAULT 'MZN',
  vat_rate numeric NOT NULL DEFAULT 16,
  trial_days integer NOT NULL DEFAULT 7,
  plans jsonb NOT NULL DEFAULT '[]'::jsonb,
  integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
  payments jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founder read settings" ON public.platform_settings;
DROP POLICY IF EXISTS "founder write settings" ON public.platform_settings;
CREATE POLICY "founder read settings" ON public.platform_settings FOR SELECT TO authenticated USING (public.is_founder(auth.uid()));
CREATE POLICY "founder write settings" ON public.platform_settings FOR ALL TO authenticated USING (public.is_founder(auth.uid())) WITH CHECK (public.is_founder(auth.uid()));

INSERT INTO public.platform_settings (singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;

-- ---------- founder_backups ----------
CREATE TABLE IF NOT EXISTS public.founder_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  kind text NOT NULL DEFAULT 'manual' CHECK (kind IN ('manual','auto')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  size_bytes bigint,
  storage_path text,
  notes text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.founder_backups TO authenticated;
GRANT ALL ON public.founder_backups TO service_role;
ALTER TABLE public.founder_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founder manage backups" ON public.founder_backups;
CREATE POLICY "founder manage backups" ON public.founder_backups FOR ALL TO authenticated USING (public.is_founder(auth.uid())) WITH CHECK (public.is_founder(auth.uid()));

-- ---------- Helper: guard + audit ----------
CREATE OR REPLACE FUNCTION public._founder_guard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._founder_audit(_action text, _target_type text, _target_id uuid, _metadata jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.founder_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE OR REPLACE FUNCTION public.founder_list_companies(_search text DEFAULT NULL, _status text DEFAULT NULL, _limit int DEFAULT 50, _offset int DEFAULT 0)
RETURNS TABLE (
  id uuid, name text, status text, created_at timestamptz,
  users_count bigint, stores_count bigint, subscription_plan text, subscription_status text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  RETURN QUERY
  SELECT c.id, c.name, COALESCE(c.status,'active') AS status, c.created_at,
    (SELECT COUNT(*) FROM public.profiles p WHERE p.company_id = c.id) AS users_count,
    (SELECT COUNT(*) FROM public.stores s WHERE s.company_id = c.id) AS stores_count,
    (SELECT s.plan FROM public.subscriptions s WHERE s.company_id = c.id ORDER BY s.created_at DESC LIMIT 1) AS subscription_plan,
    (SELECT s.status FROM public.subscriptions s WHERE s.company_id = c.id ORDER BY s.created_at DESC LIMIT 1) AS subscription_status
  FROM public.companies c
  WHERE (_search IS NULL OR c.name ILIKE '%'||_search||'%')
    AND (_status IS NULL OR COALESCE(c.status,'active') = _status)
  ORDER BY c.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_company_stats(_company_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  PERFORM public._founder_guard();
  SELECT jsonb_build_object(
    'company', (SELECT to_jsonb(c) FROM public.companies c WHERE c.id = _company_id),
    'revenue_total', COALESCE((SELECT SUM(total) FROM public.sales WHERE company_id = _company_id AND status = 'CONCLUIDA'),0),
    'sales_count', COALESCE((SELECT COUNT(*) FROM public.sales WHERE company_id = _company_id),0),
    'products_count', COALESCE((SELECT COUNT(*) FROM public.products WHERE company_id = _company_id),0),
    'stores_count', COALESCE((SELECT COUNT(*) FROM public.stores WHERE company_id = _company_id),0),
    'employees_count', COALESCE((SELECT COUNT(*) FROM public.employees WHERE company_id = _company_id),0),
    'subscription', (SELECT to_jsonb(s) FROM public.subscriptions s WHERE s.company_id = _company_id ORDER BY s.created_at DESC LIMIT 1),
    'last_login', (SELECT MAX(created_at) FROM public.auth_event_logs WHERE user_id IN (SELECT id FROM public.profiles WHERE company_id = _company_id))
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_set_company_status(_company_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  IF _status NOT IN ('active','suspended','deleted') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.companies SET status = _status, updated_at = now() WHERE id = _company_id;
  PERFORM public._founder_audit('company.set_status','company',_company_id, jsonb_build_object('status',_status));
END;
$$;

-- ============================================================
-- USERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.founder_list_users(_search text DEFAULT NULL, _company_id uuid DEFAULT NULL, _role text DEFAULT NULL, _blocked boolean DEFAULT NULL, _limit int DEFAULT 50, _offset int DEFAULT 0)
RETURNS TABLE (
  id uuid, email text, full_name text, company_id uuid, company_name text,
  is_founder boolean, blocked_at timestamptz, roles text[], created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.company_id,
    (SELECT c.name FROM public.companies c WHERE c.id = p.company_id) AS company_name,
    COALESCE(p.is_founder,false) AS is_founder,
    p.blocked_at,
    ARRAY(SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id) AS roles,
    p.created_at
  FROM public.profiles p
  WHERE (_search IS NULL OR p.email ILIKE '%'||_search||'%' OR p.full_name ILIKE '%'||_search||'%')
    AND (_company_id IS NULL OR p.company_id = _company_id)
    AND (_role IS NULL OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role::text = _role))
    AND (_blocked IS NULL OR (_blocked = true AND p.blocked_at IS NOT NULL) OR (_blocked = false AND p.blocked_at IS NULL))
  ORDER BY p.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_set_user_blocked(_user_id uuid, _blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  UPDATE public.profiles SET blocked_at = CASE WHEN _blocked THEN now() ELSE NULL END, updated_at = now() WHERE id = _user_id;
  PERFORM public._founder_audit('user.set_blocked','user',_user_id, jsonb_build_object('blocked',_blocked));
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_force_logout(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  UPDATE public.profiles SET force_logout_at = now(), updated_at = now() WHERE id = _user_id;
  PERFORM public._founder_audit('user.force_logout','user',_user_id, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_toggle_founder(_user_id uuid, _enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  UPDATE public.profiles SET is_founder = _enabled, account_type = CASE WHEN _enabled THEN 'FOUNDER' ELSE 'STANDARD' END, updated_at = now() WHERE id = _user_id;
  PERFORM public._founder_audit('user.toggle_founder','user',_user_id, jsonb_build_object('enabled',_enabled));
END;
$$;

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.founder_list_subscriptions(_status text DEFAULT NULL, _limit int DEFAULT 50, _offset int DEFAULT 0)
RETURNS SETOF public.subscriptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  RETURN QUERY
  SELECT * FROM public.subscriptions
  WHERE (_status IS NULL OR status = _status)
  ORDER BY created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_set_subscription(_company_id uuid, _plan text, _status text, _expires_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  UPDATE public.subscriptions SET plan = _plan, status = _status, expires_at = _expires_at, updated_at = now() WHERE company_id = _company_id;
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (company_id, plan, status, expires_at) VALUES (_company_id, _plan, _status, _expires_at);
  END IF;
  PERFORM public._founder_audit('subscription.set','company',_company_id, jsonb_build_object('plan',_plan,'status',_status,'expires_at',_expires_at));
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_grant_lifetime(_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  UPDATE public.subscriptions SET plan = 'MAX_ENTERPRISE', status = 'active', expires_at = NULL, updated_at = now() WHERE company_id = _company_id;
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (company_id, plan, status, expires_at) VALUES (_company_id, 'MAX_ENTERPRISE', 'active', NULL);
  END IF;
  PERFORM public._founder_audit('subscription.lifetime','company',_company_id,'{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_extend_trial(_company_id uuid, _days int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  UPDATE public.subscriptions SET expires_at = COALESCE(expires_at, now()) + make_interval(days => _days), updated_at = now() WHERE company_id = _company_id;
  PERFORM public._founder_audit('subscription.extend_trial','company',_company_id, jsonb_build_object('days',_days));
END;
$$;

-- ============================================================
-- AUDIT SEARCH (unificado)
-- ============================================================
CREATE OR REPLACE FUNCTION public.founder_audit_search(_source text DEFAULT NULL, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _actor uuid DEFAULT NULL, _limit int DEFAULT 100, _offset int DEFAULT 0)
RETURNS TABLE (source text, id uuid, actor_id uuid, action text, target text, metadata jsonb, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  RETURN QUERY
  SELECT * FROM (
    SELECT 'founder'::text AS source, fa.id, fa.actor_id, fa.action, fa.target_type||':'||COALESCE(fa.target_id::text,''), fa.metadata, fa.created_at
      FROM public.founder_audit_log fa
    UNION ALL
    SELECT 'audit'::text, al.id, al.user_id, al.action, COALESCE(al.table_name,'')||':'||COALESCE(al.record_id::text,''), COALESCE(al.new_data,'{}'::jsonb), al.created_at
      FROM public.audit_logs al
    UNION ALL
    SELECT 'auth'::text, ae.id, ae.user_id, ae.event_type, COALESCE(ae.ip_address,''), COALESCE(ae.metadata,'{}'::jsonb), ae.created_at
      FROM public.auth_event_logs ae
  ) x
  WHERE (_source IS NULL OR x.source = _source)
    AND (_from IS NULL OR x.created_at >= _from)
    AND (_to IS NULL OR x.created_at <= _to)
    AND (_actor IS NULL OR x.actor_id = _actor)
  ORDER BY x.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

-- ============================================================
-- PLATFORM SETTINGS
-- ============================================================
CREATE OR REPLACE FUNCTION public.founder_platform_settings_get()
RETURNS SETOF public.platform_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  RETURN QUERY SELECT * FROM public.platform_settings WHERE singleton = true LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_platform_settings_upsert(_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._founder_guard();
  UPDATE public.platform_settings SET
    name = COALESCE(_payload->>'name', name),
    logo_url = COALESCE(_payload->>'logo_url', logo_url),
    default_language = COALESCE(_payload->>'default_language', default_language),
    timezone = COALESCE(_payload->>'timezone', timezone),
    currency = COALESCE(_payload->>'currency', currency),
    vat_rate = COALESCE((_payload->>'vat_rate')::numeric, vat_rate),
    trial_days = COALESCE((_payload->>'trial_days')::int, trial_days),
    plans = COALESCE(_payload->'plans', plans),
    integrations = COALESCE(_payload->'integrations', integrations),
    payments = COALESCE(_payload->'payments', payments),
    updated_by = auth.uid(),
    updated_at = now()
  WHERE singleton = true;
  PERFORM public._founder_audit('settings.update','platform',NULL,_payload);
END;
$$;

-- ============================================================
-- GRANTS on RPCs
-- ============================================================
GRANT EXECUTE ON FUNCTION public.founder_list_companies(text,text,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_company_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_set_company_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_list_users(text,uuid,text,boolean,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_set_user_blocked(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_force_logout(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_toggle_founder(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_list_subscriptions(text,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_set_subscription(uuid,text,text,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_grant_lifetime(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_extend_trial(uuid,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_audit_search(text,timestamptz,timestamptz,uuid,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_platform_settings_get() TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_platform_settings_upsert(jsonb) TO authenticated;
