
-- Table for automated audit results
CREATE TABLE public.system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  check_name TEXT NOT NULL,
  message TEXT NOT NULL,
  action_taken TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick filtering
CREATE INDEX idx_system_audit_logs_module ON public.system_audit_logs(module);
CREATE INDEX idx_system_audit_logs_severity ON public.system_audit_logs(severity);
CREATE INDEX idx_system_audit_logs_created ON public.system_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/CEOs can read
CREATE POLICY "Admins can view audit logs"
  ON public.system_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo')
  );
