
CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_code TEXT,
  retries INTEGER DEFAULT 0,
  timeout BOOLEAN DEFAULT false,
  payload_size INTEGER,
  response_size INTEGER,
  user_id UUID,
  company_id UUID,
  request_id TEXT,
  event_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.telemetry_events TO service_role;
GRANT SELECT ON public.telemetry_events TO authenticated;

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can read telemetry_events"
  ON public.telemetry_events FOR SELECT
  TO authenticated
  USING (public.is_founder(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_telemetry_events_ts ON public.telemetry_events (event_ts DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_kind_name ON public.telemetry_events (kind, name);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_company ON public.telemetry_events (company_id) WHERE company_id IS NOT NULL;
