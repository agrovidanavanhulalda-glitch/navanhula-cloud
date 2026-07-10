
-- Extend impersonation_sessions
ALTER TABLE public.impersonation_sessions
  ADD COLUMN IF NOT EXISTS simulated_company_id UUID,
  ADD COLUMN IF NOT EXISTS simulated_store_id UUID,
  ADD COLUMN IF NOT EXISTS simulated_role TEXT,
  ADD COLUMN IF NOT EXISTS simulated_tenant_id UUID,
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_impersonation_actor_active
  ON public.impersonation_sessions(actor_id) WHERE ended_at IS NULL;

-- RLS
DROP POLICY IF EXISTS "Founders manage impersonation" ON public.impersonation_sessions;
CREATE POLICY "Founders manage impersonation"
  ON public.impersonation_sessions FOR ALL
  TO authenticated
  USING (public.is_founder(auth.uid()))
  WITH CHECK (public.is_founder(auth.uid()));

-- Start simulation
CREATE OR REPLACE FUNCTION public.founder_impersonate_start(
  p_target_user_id UUID,
  p_company_id UUID DEFAULT NULL,
  p_store_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_expires_minutes INTEGER DEFAULT 60,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_session_id UUID;
  v_target_is_founder BOOLEAN;
BEGIN
  IF NOT public.is_founder(v_actor) THEN
    RAISE EXCEPTION 'ACCESS_DENIED: not a founder';
  END IF;

  IF p_target_user_id = v_actor THEN
    RAISE EXCEPTION 'INVALID_TARGET: cannot impersonate self';
  END IF;

  SELECT COALESCE(is_founder, false) OR account_type = 'FOUNDER'
    INTO v_target_is_founder
    FROM public.profiles WHERE id = p_target_user_id;
  IF v_target_is_founder THEN
    RAISE EXCEPTION 'INVALID_TARGET: cannot impersonate another founder';
  END IF;

  -- Close any active session
  UPDATE public.impersonation_sessions
     SET ended_at = now(),
         duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::INTEGER * 1000
   WHERE actor_id = v_actor AND ended_at IS NULL;

  INSERT INTO public.impersonation_sessions(
    actor_id, target_id, reason, read_only,
    simulated_company_id, simulated_store_id, simulated_role,
    ip, user_agent, expires_at
  ) VALUES (
    v_actor, p_target_user_id, p_reason, false,
    p_company_id, p_store_id, p_role,
    p_ip, p_user_agent,
    now() + make_interval(mins => COALESCE(p_expires_minutes, 60))
  ) RETURNING id INTO v_session_id;

  INSERT INTO public.founder_audit_log(actor_id, action, target_type, target_id, metadata)
  VALUES (v_actor, 'impersonate_start', 'user', p_target_user_id,
          jsonb_build_object('session_id', v_session_id, 'company_id', p_company_id,
                             'store_id', p_store_id, 'role', p_role, 'reason', p_reason));

  RETURN jsonb_build_object('session_id', v_session_id, 'started_at', now());
END;
$$;

-- End simulation
CREATE OR REPLACE FUNCTION public.founder_impersonate_end()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.impersonation_sessions%ROWTYPE;
BEGIN
  IF NOT public.is_founder(v_actor) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  UPDATE public.impersonation_sessions
     SET ended_at = now(),
         duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::INTEGER * 1000
   WHERE actor_id = v_actor AND ended_at IS NULL
   RETURNING * INTO v_row;

  IF v_row.id IS NOT NULL THEN
    INSERT INTO public.founder_audit_log(actor_id, action, target_type, target_id, metadata)
    VALUES (v_actor, 'impersonate_end', 'user', v_row.target_id,
            jsonb_build_object('session_id', v_row.id, 'duration_ms', v_row.duration_ms));
  END IF;

  RETURN jsonb_build_object('ended', v_row.id IS NOT NULL, 'session_id', v_row.id);
END;
$$;

-- Current session
CREATE OR REPLACE FUNCTION public.founder_impersonate_current()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_result jsonb;
BEGIN
  IF NOT public.is_founder(v_actor) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'session_id', s.id,
    'target_id', s.target_id,
    'target_name', p.full_name,
    'target_email', p.email,
    'company_id', s.simulated_company_id,
    'company_name', c.name,
    'store_id', s.simulated_store_id,
    'role', s.simulated_role,
    'started_at', s.started_at,
    'expires_at', s.expires_at,
    'reason', s.reason
  )
  INTO v_result
  FROM public.impersonation_sessions s
  LEFT JOIN public.profiles p ON p.id = s.target_id
  LEFT JOIN public.companies c ON c.id = s.simulated_company_id
  WHERE s.actor_id = v_actor
    AND s.ended_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY s.started_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- History list
CREATE OR REPLACE FUNCTION public.founder_impersonate_history(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID, target_id UUID, target_name TEXT, target_email TEXT,
  company_id UUID, store_id UUID, role TEXT,
  started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ, duration_ms INTEGER,
  reason TEXT, ip TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.target_id, p.full_name, p.email,
         s.simulated_company_id, s.simulated_store_id, s.simulated_role,
         s.started_at, s.ended_at, s.duration_ms, s.reason, s.ip
    FROM public.impersonation_sessions s
    LEFT JOIN public.profiles p ON p.id = s.target_id
   WHERE public.is_founder(auth.uid())
     AND s.actor_id = auth.uid()
   ORDER BY s.started_at DESC
   LIMIT COALESCE(p_limit, 50);
$$;

GRANT EXECUTE ON FUNCTION public.founder_impersonate_start(UUID,UUID,UUID,TEXT,TEXT,INTEGER,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_impersonate_end() TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_impersonate_current() TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_impersonate_history(INTEGER) TO authenticated;
