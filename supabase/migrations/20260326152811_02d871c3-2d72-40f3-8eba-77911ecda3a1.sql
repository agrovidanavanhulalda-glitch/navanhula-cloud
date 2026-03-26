
-- 1. Payment Logs table for full request/response auditing
CREATE TABLE public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  action TEXT NOT NULL, -- 'initiate', 'webhook_received', 'status_check', 'payout'
  request_payload JSONB,
  response_payload JSONB,
  http_status INTEGER,
  status TEXT DEFAULT 'sent', -- 'sent', 'success', 'error'
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view own payment logs"
  ON public.payment_logs FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE INDEX idx_payment_logs_transaction ON public.payment_logs(transaction_id);
CREATE INDEX idx_payment_logs_company ON public.payment_logs(company_id);
CREATE INDEX idx_payment_logs_created ON public.payment_logs(created_at DESC);

-- 2. Add retry tracking to payment_transactions
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_response JSONB;
