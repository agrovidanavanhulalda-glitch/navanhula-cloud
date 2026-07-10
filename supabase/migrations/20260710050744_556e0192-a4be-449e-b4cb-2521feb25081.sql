
-- Extend founder_backups with checksum, storage_path, duration, type, frequency
ALTER TABLE public.founder_backups
  ADD COLUMN IF NOT EXISTS checksum TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS backup_type TEXT NOT NULL DEFAULT 'manual' CHECK (backup_type IN ('manual','scheduled')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed')),
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backup schedules
CREATE TABLE IF NOT EXISTS public.founder_backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','custom')),
  cron_expression TEXT,
  hour SMALLINT NOT NULL DEFAULT 3,
  minute SMALLINT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_backup_schedules TO authenticated;
GRANT ALL ON public.founder_backup_schedules TO service_role;
ALTER TABLE public.founder_backup_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage backup schedules"
  ON public.founder_backup_schedules FOR ALL
  TO authenticated
  USING (public.is_founder(auth.uid()))
  WITH CHECK (public.is_founder(auth.uid()));

-- Update founder_backups policy to allow founders to manage
DROP POLICY IF EXISTS "Founders manage backups" ON public.founder_backups;
CREATE POLICY "Founders manage backups"
  ON public.founder_backups FOR ALL
  TO authenticated
  USING (public.is_founder(auth.uid()))
  WITH CHECK (public.is_founder(auth.uid()));

-- RPCs
CREATE OR REPLACE FUNCTION public.founder_backup_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  last_b RECORD;
  next_s RECORD;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO last_b FROM public.founder_backups
    WHERE status = 'success' ORDER BY created_at DESC LIMIT 1;
  SELECT * INTO next_s FROM public.founder_backup_schedules
    WHERE enabled = true ORDER BY next_run_at NULLS LAST LIMIT 1;

  result := jsonb_build_object(
    'last_backup_at', last_b.created_at,
    'last_backup_size', COALESCE(last_b.size_bytes, 0),
    'last_backup_duration_ms', COALESCE(last_b.duration_ms, 0),
    'last_checksum', last_b.checksum,
    'last_storage_path', last_b.storage_path,
    'next_backup_at', next_s.next_run_at,
    'schedule_enabled', COALESCE(next_s.enabled, false),
    'schedule_frequency', next_s.frequency,
    'total_backups', (SELECT count(*) FROM public.founder_backups),
    'successful_backups', (SELECT count(*) FROM public.founder_backups WHERE status = 'success'),
    'failed_backups', (SELECT count(*) FROM public.founder_backups WHERE status = 'failed'),
    'total_storage_bytes', (SELECT COALESCE(sum(size_bytes),0) FROM public.founder_backups WHERE status = 'success')
  );
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_backup_list(p_limit INT DEFAULT 100)
RETURNS SETOF public.founder_backups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT * FROM public.founder_backups ORDER BY created_at DESC LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_backup_delete(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.founder_backups WHERE id = p_id;
  INSERT INTO public.founder_audit_log(founder_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'backup_delete', 'backup', p_id, jsonb_build_object('id', p_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_backup_schedule_upsert(
  p_frequency TEXT,
  p_hour SMALLINT DEFAULT 3,
  p_minute SMALLINT DEFAULT 0,
  p_cron TEXT DEFAULT NULL,
  p_enabled BOOLEAN DEFAULT true
) RETURNS public.founder_backup_schedules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.founder_backup_schedules;
  next_at TIMESTAMPTZ;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  next_at := CASE p_frequency
    WHEN 'daily'   THEN (date_trunc('day', now()) + make_interval(days => 1, hours => p_hour, mins => p_minute))
    WHEN 'weekly'  THEN (date_trunc('day', now()) + make_interval(days => 7, hours => p_hour, mins => p_minute))
    WHEN 'monthly' THEN (date_trunc('day', now()) + make_interval(months => 1, hours => p_hour, mins => p_minute))
    ELSE now() + interval '1 day'
  END;

  DELETE FROM public.founder_backup_schedules;
  INSERT INTO public.founder_backup_schedules(frequency, cron_expression, hour, minute, enabled, next_run_at, created_by)
    VALUES (p_frequency, p_cron, p_hour, p_minute, p_enabled, next_at, auth.uid())
  RETURNING * INTO s;

  INSERT INTO public.founder_audit_log(founder_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'backup_schedule_upsert', 'schedule', s.id,
      jsonb_build_object('frequency', p_frequency, 'hour', p_hour, 'enabled', p_enabled));
  RETURN s;
END;
$$;

CREATE OR REPLACE FUNCTION public.founder_backup_schedule_get()
RETURNS public.founder_backup_schedules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s public.founder_backup_schedules;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO s FROM public.founder_backup_schedules ORDER BY created_at DESC LIMIT 1;
  RETURN s;
END;
$$;
