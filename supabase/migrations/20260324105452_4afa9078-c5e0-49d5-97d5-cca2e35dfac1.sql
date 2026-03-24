
-- 1. Add fee/commission columns to wallet_transactions
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 2. Create payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  store_id UUID REFERENCES public.stores(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  phone_number TEXT,
  bank_account TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create platform_fees config table
CREATE TABLE IF NOT EXISTS public.platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type TEXT NOT NULL DEFAULT 'payment',
  fee_percentage NUMERIC NOT NULL DEFAULT 2.5,
  fee_fixed NUMERIC NOT NULL DEFAULT 0,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  max_amount NUMERIC,
  provider TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Insert default fee config
INSERT INTO public.platform_fees (fee_type, fee_percentage, fee_fixed, provider)
VALUES 
  ('payment', 2.5, 0, 'mpesa'),
  ('payment', 2.5, 0, 'emola'),
  ('payment', 2.5, 0, 'mkesh'),
  ('payment', 0, 0, 'cash'),
  ('payout', 1.0, 0, NULL)
ON CONFLICT DO NOTHING;

-- 5. RLS for payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company payouts" ON public.payouts
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins can insert payouts" ON public.payouts
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Admins can update payouts" ON public.payouts
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.is_manager_or_admin(auth.uid()));

-- 6. RLS for platform_fees (read-only for all authenticated)
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active fees" ON public.platform_fees
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 7. Create process_nava_payment RPC
CREATE OR REPLACE FUNCTION public.process_nava_payment(
  p_store_id UUID,
  p_payment_method TEXT,
  p_amount NUMERIC,
  p_provider TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_description TEXT DEFAULT 'Pagamento recebido'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_fee_pct NUMERIC;
  v_fee_fixed NUMERIC;
  v_fee_amount NUMERIC;
  v_net_amount NUMERIC;
  v_wallet_id UUID;
  v_new_balance NUMERIC;
BEGIN
  -- Get company
  SELECT company_id INTO v_company_id FROM stores WHERE id = p_store_id;
  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Loja não encontrada');
  END IF;

  -- Get fee config
  SELECT COALESCE(fee_percentage, 0), COALESCE(fee_fixed, 0)
  INTO v_fee_pct, v_fee_fixed
  FROM platform_fees
  WHERE fee_type = 'payment'
    AND is_active = true
    AND (provider = COALESCE(p_provider, p_payment_method) OR provider IS NULL)
  ORDER BY provider NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    v_fee_pct := 0;
    v_fee_fixed := 0;
  END IF;

  -- Calculate fee
  v_fee_amount := ROUND((p_amount * v_fee_pct / 100) + v_fee_fixed, 2);
  v_net_amount := p_amount - v_fee_amount;

  -- Upsert wallet
  INSERT INTO wallets (store_id, company_id, payment_method, balance)
  VALUES (p_store_id, v_company_id, p_payment_method, v_net_amount)
  ON CONFLICT (store_id, payment_method)
  DO UPDATE SET balance = wallets.balance + v_net_amount, updated_at = now()
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  -- Record transaction
  INSERT INTO wallet_transactions (
    wallet_id, store_id, company_id, type, amount,
    fee_amount, net_amount, balance_after,
    provider, reference, description, created_by
  ) VALUES (
    v_wallet_id, p_store_id, v_company_id, 'credit', p_amount,
    v_fee_amount, v_net_amount, v_new_balance,
    COALESCE(p_provider, p_payment_method), p_reference,
    p_description, auth.uid()
  );

  RETURN json_build_object(
    'success', true,
    'amount', p_amount,
    'fee', v_fee_amount,
    'net', v_net_amount,
    'balance', v_new_balance
  );
END;
$$;

-- 8. Create request_payout RPC
CREATE OR REPLACE FUNCTION public.request_payout(
  p_store_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'mpesa',
  p_phone_number TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_total_balance NUMERIC;
  v_fee_pct NUMERIC;
  v_fee_amount NUMERIC;
  v_net_amount NUMERIC;
  v_payout_id UUID;
BEGIN
  IF NOT is_manager_or_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissão');
  END IF;

  v_company_id := get_user_company(auth.uid());

  -- Check total balance across all wallets for this store
  SELECT COALESCE(SUM(balance), 0) INTO v_total_balance
  FROM wallets WHERE store_id = p_store_id AND company_id = v_company_id;

  IF v_total_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente. Disponível: ' || v_total_balance);
  END IF;

  -- Get payout fee
  SELECT COALESCE(fee_percentage, 0) INTO v_fee_pct
  FROM platform_fees WHERE fee_type = 'payout' AND is_active = true LIMIT 1;
  
  v_fee_amount := ROUND(p_amount * COALESCE(v_fee_pct, 0) / 100, 2);
  v_net_amount := p_amount - v_fee_amount;

  -- Create payout record
  INSERT INTO payouts (company_id, store_id, amount, fee_amount, net_amount, payment_method, phone_number, created_by)
  VALUES (v_company_id, p_store_id, p_amount, v_fee_amount, v_net_amount, p_payment_method, p_phone_number, auth.uid())
  RETURNING id INTO v_payout_id;

  -- Deduct from cash wallet (primary)
  UPDATE wallets
  SET balance = GREATEST(0, balance - p_amount), updated_at = now()
  WHERE store_id = p_store_id AND payment_method = 'cash' AND company_id = v_company_id;

  RETURN json_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'amount', p_amount,
    'fee', v_fee_amount,
    'net', v_net_amount
  );
END;
$$;

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payouts_company ON public.payouts(company_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_company ON public.wallet_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_provider ON public.wallet_transactions(provider);
