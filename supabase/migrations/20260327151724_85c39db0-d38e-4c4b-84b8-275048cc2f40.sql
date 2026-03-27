
-- Manual payments table for Mobile Money confirmation workflow
CREATE TABLE public.manual_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  store_id uuid REFERENCES public.stores(id),
  sale_id uuid REFERENCES public.sales(id),
  amount numeric NOT NULL,
  phone text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('mpesa', 'emola', 'mkesh')),
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

-- Company members can view their own payments
CREATE POLICY "Users view company manual payments"
  ON public.manual_payments FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

-- Any authenticated user from the company can create
CREATE POLICY "Users create company manual payments"
  ON public.manual_payments FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()));

-- Only admins/managers can confirm or reject
CREATE POLICY "Admins manage manual payments"
  ON public.manual_payments FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));

-- Function to generate unique NAVA reference
CREATE OR REPLACE FUNCTION public.generate_nava_reference()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'NAVA-' || EXTRACT(EPOCH FROM now())::bigint::text || '-' || floor(random() * 99 + 1)::int::text;
$$;

-- Function to confirm manual payment (updates wallet + sale)
CREATE OR REPLACE FUNCTION public.confirm_manual_payment(
  p_payment_id uuid,
  p_confirmed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment manual_payments%ROWTYPE;
  v_fee_pct numeric := 0;
  v_fee_fixed numeric := 0;
  v_fee_amount numeric;
  v_net_amount numeric;
BEGIN
  -- Lock and fetch payment
  SELECT * INTO v_payment FROM manual_payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pagamento não encontrado');
  END IF;

  IF v_payment.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pagamento já processado');
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

  -- Update payment status
  UPDATE manual_payments
  SET status = 'confirmed',
      confirmed_by = p_confirmed_by,
      confirmed_at = now(),
      updated_at = now()
  WHERE id = p_payment_id;

  -- Update sale status if linked
  IF v_payment.sale_id IS NOT NULL THEN
    UPDATE sales SET status = 'completed' WHERE id = v_payment.sale_id;
  END IF;

  -- Credit wallet
  IF v_payment.store_id IS NOT NULL THEN
    INSERT INTO wallets (store_id, payment_method, balance)
    VALUES (v_payment.store_id, v_payment.provider, v_net_amount)
    ON CONFLICT (store_id, payment_method)
    DO UPDATE SET balance = wallets.balance + v_net_amount, updated_at = now();

    -- Record transaction
    INSERT INTO wallet_transactions (store_id, type, amount, fee_amount, net_amount, payment_method, provider, reference, description)
    VALUES (
      v_payment.store_id, 'credit', v_payment.amount, v_fee_amount, v_net_amount,
      v_payment.provider, v_payment.provider, v_payment.reference,
      'Pagamento manual confirmado - ' || v_payment.reference
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Pagamento confirmado com sucesso', 'net_amount', v_net_amount, 'fee', v_fee_amount);
END;
$$;

-- Function to reject manual payment
CREATE OR REPLACE FUNCTION public.reject_manual_payment(
  p_payment_id uuid,
  p_rejected_by uuid,
  p_reason text DEFAULT 'Pagamento não confirmado'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Cancel sale if linked
  IF v_payment.sale_id IS NOT NULL THEN
    UPDATE sales SET status = 'cancelled' WHERE id = v_payment.sale_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Pagamento rejeitado');
END;
$$;
