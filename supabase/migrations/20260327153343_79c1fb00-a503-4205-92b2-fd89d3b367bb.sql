
-- 1. Add anti-fraud columns to manual_payments
ALTER TABLE public.manual_payments
  ADD COLUMN IF NOT EXISTS fraud_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fraud_reason text,
  ADD COLUMN IF NOT EXISTS risk_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proof_image_url text;

-- 2. Create fraud detection function
CREATE OR REPLACE FUNCTION public.evaluate_payment_fraud(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment manual_payments%ROWTYPE;
  v_score integer := 0;
  v_reasons text[] := '{}';
  v_sale_total numeric;
  v_dup_count integer;
BEGIN
  SELECT * INTO v_payment FROM manual_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pagamento não encontrado');
  END IF;

  -- Rule 1: Duplicate reference (other than self)
  IF EXISTS (
    SELECT 1 FROM manual_payments
    WHERE reference = v_payment.reference
      AND id != v_payment.id
      AND status IN ('pending', 'confirmed')
  ) THEN
    v_score := v_score + 40;
    v_reasons := array_append(v_reasons, 'Referência duplicada');
  END IF;

  -- Rule 2: Value mismatch with sale
  IF v_payment.sale_id IS NOT NULL THEN
    SELECT total INTO v_sale_total FROM sales WHERE id = v_payment.sale_id;
    IF v_sale_total IS NOT NULL AND v_payment.amount != v_sale_total THEN
      v_score := v_score + 30;
      v_reasons := array_append(v_reasons, 'Valor divergente da venda (esperado: ' || v_sale_total || ')');
    END IF;
  END IF;

  -- Rule 3: Multiple payments same phone+amount within 5 min
  SELECT count(*) INTO v_dup_count
  FROM manual_payments
  WHERE phone = v_payment.phone
    AND amount = v_payment.amount
    AND id != v_payment.id
    AND created_at >= v_payment.created_at - interval '5 minutes'
    AND created_at <= v_payment.created_at + interval '5 minutes';

  IF v_dup_count > 0 THEN
    v_score := v_score + 10;
    v_reasons := array_append(v_reasons, 'Pagamento repetido (mesmo valor/número em 5 min)');
  END IF;

  -- Update payment with fraud info
  UPDATE manual_payments
  SET risk_score = v_score,
      fraud_flag = (v_score > 50),
      fraud_reason = CASE WHEN array_length(v_reasons, 1) > 0
        THEN array_to_string(v_reasons, '; ')
        ELSE NULL END,
      updated_at = now()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'risk_score', v_score,
    'fraud_flag', (v_score > 50),
    'reasons', to_jsonb(v_reasons)
  );
END;
$$;

-- 3. Auto-evaluate fraud on new payments
CREATE OR REPLACE FUNCTION public.auto_evaluate_payment_fraud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM evaluate_payment_fraud(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evaluate_fraud ON public.manual_payments;
CREATE TRIGGER trg_evaluate_fraud
  AFTER INSERT ON public.manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_evaluate_payment_fraud();

-- 4. Update confirm function to check fraud and log audit
CREATE OR REPLACE FUNCTION public.confirm_manual_payment(p_payment_id uuid, p_confirmed_by uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment manual_payments%ROWTYPE;
  v_fee_pct numeric := 0;
  v_fee_fixed numeric := 0;
  v_fee_amount numeric;
  v_net_amount numeric;
BEGIN
  SELECT * INTO v_payment FROM manual_payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pagamento não encontrado');
  END IF;

  IF v_payment.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pagamento já processado');
  END IF;

  -- Re-evaluate fraud before confirming
  PERFORM evaluate_payment_fraud(p_payment_id);
  SELECT * INTO v_payment FROM manual_payments WHERE id = p_payment_id;

  -- Block if duplicate reference exists as confirmed
  IF EXISTS (
    SELECT 1 FROM manual_payments
    WHERE reference = v_payment.reference
      AND id != v_payment.id
      AND status = 'confirmed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Referência já utilizada em outro pagamento confirmado');
  END IF;

  -- Get platform fee
  SELECT COALESCE(fee_percentage, 0), COALESCE(fee_fixed, 0)
  INTO v_fee_pct, v_fee_fixed
  FROM platform_fees
  WHERE fee_type = 'payment' AND is_active = true
  AND (provider = v_payment.provider OR provider IS NULL)
  ORDER BY provider NULLS LAST
  LIMIT 1;

  v_fee_amount := ROUND((v_payment.amount * v_fee_pct / 100) + v_fee_fixed, 2);
  v_net_amount := v_payment.amount - v_fee_amount;

  UPDATE manual_payments
  SET status = 'confirmed',
      confirmed_by = p_confirmed_by,
      confirmed_at = now(),
      updated_at = now()
  WHERE id = p_payment_id;

  IF v_payment.sale_id IS NOT NULL THEN
    UPDATE sales SET status = 'completed' WHERE id = v_payment.sale_id;
  END IF;

  IF v_payment.store_id IS NOT NULL THEN
    INSERT INTO wallets (store_id, payment_method, balance)
    VALUES (v_payment.store_id, v_payment.provider, v_net_amount)
    ON CONFLICT (store_id, payment_method)
    DO UPDATE SET balance = wallets.balance + v_net_amount, updated_at = now();

    INSERT INTO wallet_transactions (store_id, type, amount, fee_amount, net_amount, payment_method, provider, reference, description)
    VALUES (
      v_payment.store_id, 'credit', v_payment.amount, v_fee_amount, v_net_amount,
      v_payment.provider, v_payment.provider, v_payment.reference,
      'Pagamento manual confirmado - ' || v_payment.reference
    );
  END IF;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (p_confirmed_by, 'confirm_payment', 'manual_payments', p_payment_id::text,
    jsonb_build_object('amount', v_payment.amount, 'reference', v_payment.reference, 'risk_score', v_payment.risk_score, 'fraud_flag', v_payment.fraud_flag));

  RETURN jsonb_build_object('success', true, 'message', 'Pagamento confirmado com sucesso', 'net_amount', v_net_amount, 'fee', v_fee_amount, 'risk_score', v_payment.risk_score);
END;
$$;

-- 5. Update reject function to log audit
CREATE OR REPLACE FUNCTION public.reject_manual_payment(p_payment_id uuid, p_rejected_by uuid, p_reason text DEFAULT 'Pagamento não confirmado')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment manual_payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM manual_payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pagamento não encontrado');
  END IF;

  IF v_payment.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pagamento já processado');
  END IF;

  UPDATE manual_payments
  SET status = 'rejected',
      confirmed_by = p_rejected_by,
      confirmed_at = now(),
      rejection_reason = p_reason,
      updated_at = now()
  WHERE id = p_payment_id;

  IF v_payment.sale_id IS NOT NULL THEN
    UPDATE sales SET status = 'cancelled' WHERE id = v_payment.sale_id;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (p_rejected_by, 'reject_payment', 'manual_payments', p_payment_id::text,
    jsonb_build_object('amount', v_payment.amount, 'reference', v_payment.reference, 'reason', p_reason));

  RETURN jsonb_build_object('success', true, 'message', 'Pagamento rejeitado');
END;
$$;

-- 6. Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload proofs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Anyone can view proofs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs');
