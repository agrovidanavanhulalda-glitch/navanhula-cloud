
-- Helper: founder detection (idempotent)
CREATE OR REPLACE FUNCTION public.is_founder_user(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_founder FROM public.profiles p WHERE p.id = _uid),
    false
  )
  OR COALESCE(
    (SELECT (p.account_type = 'FOUNDER') FROM public.profiles p WHERE p.id = _uid),
    false
  );
$$;

-- Agentic audit log
CREATE TABLE public.agentic_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NULL,
  workflow_id TEXT NULL,
  decision_id TEXT NULL,
  decision_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  impact_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED','EXPIRED','EXECUTED')),
  recommendation TEXT NULL,
  rollback_plan TEXT NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agentic_audit_company ON public.agentic_audit_log(company_id);
CREATE INDEX idx_agentic_audit_status ON public.agentic_audit_log(status);
CREATE INDEX idx_agentic_audit_severity ON public.agentic_audit_log(severity);
CREATE INDEX idx_agentic_audit_created_at ON public.agentic_audit_log(created_at DESC);
CREATE INDEX idx_agentic_audit_workflow ON public.agentic_audit_log(workflow_id);

GRANT SELECT, INSERT, UPDATE ON public.agentic_audit_log TO authenticated;
GRANT ALL ON public.agentic_audit_log TO service_role;

ALTER TABLE public.agentic_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can read agentic audit"
  ON public.agentic_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_founder_user(auth.uid()));

CREATE POLICY "Founders can insert agentic audit"
  ON public.agentic_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_founder_user(auth.uid()));

CREATE POLICY "Founders can update agentic audit"
  ON public.agentic_audit_log
  FOR UPDATE
  TO authenticated
  USING (public.is_founder_user(auth.uid()))
  WITH CHECK (public.is_founder_user(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_agentic_audit_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agentic_audit_updated_at
  BEFORE UPDATE ON public.agentic_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.tg_agentic_audit_updated_at();
