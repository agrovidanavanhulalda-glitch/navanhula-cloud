
-- Phase D: Feature Flags Enterprise
ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Experimental',
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('development','testing','staging','production','all')),
  ADD COLUMN IF NOT EXISTS updated_by UUID;

CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON public.feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_env ON public.feature_flags(environment);

CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('company','tenant','store','plan','user')),
  target_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (feature_flag_id, target_type, target_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flag_overrides TO authenticated;
GRANT ALL ON public.feature_flag_overrides TO service_role;

ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders manage feature_flag_overrides" ON public.feature_flag_overrides;
CREATE POLICY "founders manage feature_flag_overrides"
ON public.feature_flag_overrides
FOR ALL
TO authenticated
USING (public.is_founder())
WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "authenticated read feature_flag_overrides" ON public.feature_flag_overrides;
CREATE POLICY "authenticated read feature_flag_overrides"
ON public.feature_flag_overrides
FOR SELECT
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_ff_ovr_flag ON public.feature_flag_overrides(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_ff_ovr_target ON public.feature_flag_overrides(target_type, target_id);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trg_ff_ovr_updated ON public.feature_flag_overrides;
CREATE TRIGGER trg_ff_ovr_updated
BEFORE UPDATE ON public.feature_flag_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: upsert flag (audited)
CREATE OR REPLACE FUNCTION public.founder_feature_flag_upsert(
  p_id UUID,
  p_key TEXT,
  p_name TEXT,
  p_description TEXT,
  p_category TEXT,
  p_environment TEXT,
  p_enabled BOOLEAN
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id UUID;
  v_old JSONB;
  v_new JSONB;
BEGIN
  IF NOT public.is_founder() THEN
    RAISE EXCEPTION 'Access denied: founder only';
  END IF;

  IF p_id IS NOT NULL THEN
    SELECT to_jsonb(f.*) INTO v_old FROM public.feature_flags f WHERE id = p_id;
    UPDATE public.feature_flags
      SET key = COALESCE(p_key, key),
          name = COALESCE(p_name, name),
          description = COALESCE(p_description, description),
          category = COALESCE(p_category, category),
          environment = COALESCE(p_environment, environment),
          enabled = COALESCE(p_enabled, enabled),
          updated_by = v_uid,
          updated_at = now()
      WHERE id = p_id
      RETURNING id, to_jsonb(feature_flags.*) INTO v_id, v_new;
  ELSE
    INSERT INTO public.feature_flags (key, name, description, category, environment, enabled, updated_by)
      VALUES (p_key, p_name, p_description, COALESCE(p_category,'Experimental'), COALESCE(p_environment,'production'), COALESCE(p_enabled,false), v_uid)
      RETURNING id, to_jsonb(feature_flags.*) INTO v_id, v_new;
  END IF;

  INSERT INTO public.founder_audit_log (founder_id, action, target_type, target_id, metadata)
    VALUES (v_uid, CASE WHEN p_id IS NULL THEN 'feature_flag.create' ELSE 'feature_flag.update' END,
            'feature_flag', v_id, jsonb_build_object('old', v_old, 'new', v_new));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_feature_flag_delete(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_old JSONB;
BEGIN
  IF NOT public.is_founder() THEN
    RAISE EXCEPTION 'Access denied: founder only';
  END IF;
  SELECT to_jsonb(f.*) INTO v_old FROM public.feature_flags f WHERE id = p_id;
  DELETE FROM public.feature_flags WHERE id = p_id;
  INSERT INTO public.founder_audit_log (founder_id, action, target_type, target_id, metadata)
    VALUES (v_uid, 'feature_flag.delete', 'feature_flag', p_id, jsonb_build_object('old', v_old));
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_feature_flag_override_upsert(
  p_flag_id UUID,
  p_target_type TEXT,
  p_target_id UUID,
  p_enabled BOOLEAN,
  p_reason TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id UUID;
BEGIN
  IF NOT public.is_founder() THEN
    RAISE EXCEPTION 'Access denied: founder only';
  END IF;

  INSERT INTO public.feature_flag_overrides (feature_flag_id, target_type, target_id, enabled, reason, expires_at, created_by)
    VALUES (p_flag_id, p_target_type, p_target_id, p_enabled, p_reason, p_expires_at, v_uid)
    ON CONFLICT (feature_flag_id, target_type, target_id)
    DO UPDATE SET enabled = EXCLUDED.enabled, reason = EXCLUDED.reason, expires_at = EXCLUDED.expires_at, updated_at = now()
    RETURNING id INTO v_id;

  INSERT INTO public.founder_audit_log (founder_id, action, target_type, target_id, metadata)
    VALUES (v_uid, 'feature_flag_override.upsert', 'feature_flag_override', v_id,
            jsonb_build_object('flag_id', p_flag_id, 'target_type', p_target_type, 'target_id', p_target_id, 'enabled', p_enabled));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_feature_flag_override_delete(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF NOT public.is_founder() THEN
    RAISE EXCEPTION 'Access denied: founder only';
  END IF;
  DELETE FROM public.feature_flag_overrides WHERE id = p_id;
  INSERT INTO public.founder_audit_log (founder_id, action, target_type, target_id, metadata)
    VALUES (v_uid, 'feature_flag_override.delete', 'feature_flag_override', p_id, '{}'::jsonb);
END;
$$;

-- Resolve current effective flag value for the calling user (considers overrides)
CREATE OR REPLACE FUNCTION public.feature_flag_is_enabled(
  p_key TEXT,
  p_company_id UUID DEFAULT NULL,
  p_store_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_flag RECORD;
  v_enabled BOOLEAN;
BEGIN
  SELECT * INTO v_flag FROM public.feature_flags WHERE key = p_key LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  v_enabled := v_flag.enabled;

  -- user override
  SELECT enabled INTO v_enabled FROM public.feature_flag_overrides
    WHERE feature_flag_id = v_flag.id AND target_type = 'user' AND target_id = v_uid
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;
  IF FOUND THEN RETURN v_enabled; END IF;

  IF p_store_id IS NOT NULL THEN
    SELECT enabled INTO v_enabled FROM public.feature_flag_overrides
      WHERE feature_flag_id = v_flag.id AND target_type = 'store' AND target_id = p_store_id
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1;
    IF FOUND THEN RETURN v_enabled; END IF;
  END IF;

  IF p_company_id IS NOT NULL THEN
    SELECT enabled INTO v_enabled FROM public.feature_flag_overrides
      WHERE feature_flag_id = v_flag.id AND target_type = 'company' AND target_id = p_company_id
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1;
    IF FOUND THEN RETURN v_enabled; END IF;
  END IF;

  RETURN v_flag.enabled;
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_feature_flag_upsert(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_feature_flag_delete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_feature_flag_override_upsert(UUID,TEXT,UUID,BOOLEAN,TEXT,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_feature_flag_override_delete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feature_flag_is_enabled(TEXT,UUID,UUID) TO authenticated, anon;
