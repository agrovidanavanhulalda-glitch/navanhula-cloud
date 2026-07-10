
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- BLOCO 2: AUTO-TRIAL on company creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_setup_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only if not billing exempt and not master
  IF COALESCE(NEW.billing_exempt, false) = false AND COALESCE(NEW.is_master, false) = false THEN
    NEW.plan := COALESCE(NEW.plan, 'starter');
    NEW.subscription_status := 'trial';
    NEW.trial_expires_at := COALESCE(NEW.trial_expires_at, now() + interval '7 days');
    NEW.trial_end_date := COALESCE(NEW.trial_end_date, NEW.trial_expires_at);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_setup_trial ON public.companies;
CREATE TRIGGER trg_auto_setup_trial
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_setup_trial();

-- ============================================================
-- BLOCO 3: Payment idempotency
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_tx_provider_ref_unique
  ON public.payment_transactions (payment_method, reference_id)
  WHERE reference_id IS NOT NULL;

-- Apply payment to invoice (used by webhook)
CREATE OR REPLACE FUNCTION public.apply_payment_to_invoice(
  p_reference text,
  p_amount numeric,
  p_method text,
  p_provider_tx_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_sub_id uuid;
BEGIN
  -- Find pending invoice by payment_reference or invoice_number
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE (payment_reference = p_reference OR invoice_number = p_reference)
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invoice_not_found', 'reference', p_reference);
  END IF;

  -- Idempotency: already paid?
  IF v_invoice.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'invoice_id', v_invoice.id);
  END IF;

  -- Mark paid
  UPDATE public.invoices
  SET status = 'paid',
      paid_at = now(),
      payment_method = p_method,
      payment_reference = COALESCE(p_provider_tx_ref, p_reference),
      updated_at = now()
  WHERE id = v_invoice.id;

  -- Activate subscription
  v_sub_id := v_invoice.subscription_id;
  IF v_sub_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET status = 'active',
        updated_at = now()
    WHERE id = v_sub_id;
  END IF;

  IF v_invoice.company_id IS NOT NULL THEN
    UPDATE public.companies
    SET subscription_status = 'active',
        updated_at = now()
    WHERE id = v_invoice.company_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice.id,
    'subscription_id', v_sub_id,
    'amount', v_invoice.total_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_payment_to_invoice(text, numeric, text, text) TO service_role;

-- ============================================================
-- Renewal / expiration processor (called by pg_cron)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_subscription_renewals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_trials int := 0;
  v_past_due int := 0;
  v_overdue_invoices int := 0;
BEGIN
  -- 1) Expire trials past their trial_expires_at
  WITH updated AS (
    UPDATE public.companies
    SET subscription_status = 'past_due', updated_at = now()
    WHERE subscription_status = 'trial'
      AND trial_expires_at IS NOT NULL
      AND trial_expires_at < now()
      AND COALESCE(billing_exempt, false) = false
    RETURNING id
  )
  SELECT count(*) INTO v_expired_trials FROM updated;

  -- 2) Mark subscriptions past due if pending invoice > 7 days old
  WITH updated AS (
    UPDATE public.subscriptions s
    SET status = 'past_due', updated_at = now()
    WHERE status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.subscription_id = s.id
          AND i.status = 'pending'
          AND i.due_date < now() - interval '7 days'
      )
    RETURNING id
  )
  SELECT count(*) INTO v_past_due FROM updated;

  -- 3) Mark overdue invoices
  WITH updated AS (
    UPDATE public.invoices
    SET status = 'overdue', updated_at = now()
    WHERE status = 'pending'
      AND due_date < now()
    RETURNING id
  )
  SELECT count(*) INTO v_overdue_invoices FROM updated;

  RETURN jsonb_build_object(
    'expired_trials', v_expired_trials,
    'past_due_subs', v_past_due,
    'overdue_invoices', v_overdue_invoices,
    'ran_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_subscription_renewals() TO service_role;
