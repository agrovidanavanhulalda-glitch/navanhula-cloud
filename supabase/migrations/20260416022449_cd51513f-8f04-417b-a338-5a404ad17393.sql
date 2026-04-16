
-- Enhance webhook_deliveries with retry support
ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS signature text;

-- Index for retry queue processing
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry
  ON public.webhook_deliveries (next_retry_at)
  WHERE status = 'failed' AND attempt_count < max_attempts;

-- Add idempotency and multi-currency to payment_transactions
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS original_amount numeric,
  ADD COLUMN IF NOT EXISTS original_currency text DEFAULT 'MZN',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS converted_amount numeric;

-- Unique idempotency key per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_tx_idempotency
  ON public.payment_transactions (company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Rate limit index
CREATE INDEX IF NOT EXISTS idx_api_logs_ratelimit
  ON public.api_request_logs (api_key_id, created_at DESC);

-- Payment state constraint via trigger (not CHECK for flexibility)
CREATE OR REPLACE FUNCTION public.validate_payment_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  valid boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('pending', 'processing') THEN valid := true; END IF;
  ELSE
    CASE OLD.status
      WHEN 'pending' THEN valid := NEW.status IN ('processing', 'failed', 'cancelled');
      WHEN 'processing' THEN valid := NEW.status IN ('completed', 'failed');
      WHEN 'failed' THEN valid := NEW.status IN ('pending', 'processing');
      ELSE valid := false;
    END CASE;
  END IF;

  IF NOT valid THEN
    RAISE EXCEPTION 'Invalid payment status transition: % -> %', COALESCE(OLD.status, 'new'), NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payment_status ON public.payment_transactions;
CREATE TRIGGER trg_validate_payment_status
  BEFORE INSERT OR UPDATE OF status ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_status_transition();
