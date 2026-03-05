-- Add company contact fields needed for complete document headers
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Moçambique';

UPDATE public.companies
SET country = COALESCE(NULLIF(country, ''), 'Moçambique')
WHERE country IS NULL OR country = '';

-- Add trial tracking for subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Backfill current subscriptions and commercial price
UPDATE public.subscriptions
SET trial_ends_at = COALESCE(trial_ends_at, created_at + interval '7 days'),
    price_monthly = 1500
WHERE trial_ends_at IS NULL OR price_monthly IS DISTINCT FROM 1500;

CREATE OR REPLACE FUNCTION public.sync_company_subscription_pricing(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_store_count integer := 0;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_active_store_count
  FROM public.stores
  WHERE company_id = p_company_id
    AND COALESCE(is_active, true) = true;

  UPDATE public.subscriptions
  SET price_monthly = v_active_store_count * 1500,
      updated_at = now()
  WHERE company_id = p_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_store_subscription_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_company_subscription_pricing(COALESCE(NEW.company_id, OLD.company_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_store_subscription_pricing ON public.stores;
CREATE TRIGGER trg_handle_store_subscription_pricing
AFTER INSERT OR UPDATE OR DELETE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.handle_store_subscription_pricing();

CREATE OR REPLACE FUNCTION public.apply_subscription_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.price_monthly := COALESCE(NEW.price_monthly, 1500);
  NEW.trial_ends_at := COALESCE(NEW.trial_ends_at, now() + interval '7 days');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_subscription_defaults ON public.subscriptions;
CREATE TRIGGER trg_apply_subscription_defaults
BEFORE INSERT ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.apply_subscription_defaults();

DROP FUNCTION IF EXISTS public.process_subscription_payment(uuid, public.billing_payment_method, text, text);
CREATE FUNCTION public.process_subscription_payment(
  p_subscription_id uuid,
  p_payment_method public.billing_payment_method,
  p_reference_id text,
  p_phone_number text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_now timestamptz := now();
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  SELECT *
  INTO v_subscription
  FROM public.subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assinatura não encontrada';
  END IF;

  v_period_start := CASE
    WHEN v_subscription.trial_ends_at IS NOT NULL AND v_now <= v_subscription.trial_ends_at THEN v_subscription.trial_ends_at
    WHEN v_subscription.current_period_end > v_now THEN v_subscription.current_period_end
    ELSE v_now
  END;

  v_period_end := v_period_start + interval '30 days';

  UPDATE public.subscriptions
  SET status = 'active',
      current_period_start = v_period_start,
      current_period_end = v_period_end,
      blocked_at = NULL,
      updated_at = v_now,
      trial_ends_at = NULL,
      notes = CASE
        WHEN COALESCE(notes, '') ILIKE '%teste%' THEN 'Plano profissional ativo'
        ELSE notes
      END
  WHERE id = p_subscription_id;

  RETURN json_build_object(
    'success', true,
    'subscription_id', p_subscription_id,
    'current_period_start', v_period_start,
    'current_period_end', v_period_end,
    'payment_method', p_payment_method,
    'reference_id', p_reference_id,
    'phone_number', p_phone_number
  );
END;
$$;

SELECT public.sync_company_subscription_pricing(id)
FROM public.companies;