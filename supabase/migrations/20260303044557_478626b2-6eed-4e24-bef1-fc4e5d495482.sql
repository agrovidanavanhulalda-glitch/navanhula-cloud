
-- Wallets table: one per store per payment method
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payment_method text NOT NULL, -- cash, mpesa, emola, card, voucher
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, payment_method)
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wallets in their company"
  ON public.wallets FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage wallets"
  ON public.wallets FOR ALL TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND is_admin(auth.uid()));

-- Wallet transactions table
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  type text NOT NULL, -- credit, debit, transfer_in, transfer_out
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  sale_id uuid REFERENCES public.sales(id),
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wallet transactions in their company"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE company_id = get_user_company(auth.uid())));

CREATE POLICY "System can insert wallet transactions"
  ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE company_id = get_user_company(auth.uid())));

-- Function to credit wallet after sale
CREATE OR REPLACE FUNCTION public.credit_wallet_from_sale(
  p_store_id uuid,
  p_payment_method text,
  p_amount numeric,
  p_sale_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_company_id uuid;
  v_new_balance numeric;
BEGIN
  -- Get company from store
  SELECT company_id INTO v_company_id FROM stores WHERE id = p_store_id;
  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Loja não encontrada');
  END IF;

  -- Upsert wallet
  INSERT INTO wallets (store_id, company_id, payment_method, balance)
  VALUES (p_store_id, v_company_id, p_payment_method, p_amount)
  ON CONFLICT (store_id, payment_method) 
  DO UPDATE SET balance = wallets.balance + p_amount, updated_at = now()
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  -- Log transaction
  INSERT INTO wallet_transactions (wallet_id, store_id, type, amount, balance_after, sale_id, description, created_by)
  VALUES (v_wallet_id, p_store_id, 'credit', p_amount, v_new_balance, p_sale_id, 
          'Venda - ' || p_payment_method, auth.uid());

  RETURN json_build_object('success', true, 'wallet_id', v_wallet_id, 'new_balance', v_new_balance);
END;
$$;

-- Function to transfer between store wallets
CREATE OR REPLACE FUNCTION public.transfer_between_stores(
  p_from_store_id uuid,
  p_to_store_id uuid,
  p_payment_method text,
  p_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_wallet record;
  v_to_wallet_id uuid;
  v_company_id uuid;
  v_new_from_balance numeric;
  v_new_to_balance numeric;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Apenas admins podem transferir');
  END IF;

  v_company_id := get_user_company(auth.uid());

  -- Verify both stores belong to same company
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = p_from_store_id AND company_id = v_company_id) OR
     NOT EXISTS (SELECT 1 FROM stores WHERE id = p_to_store_id AND company_id = v_company_id) THEN
    RETURN json_build_object('success', false, 'message', 'Lojas não pertencem à mesma empresa');
  END IF;

  -- Check source wallet balance
  SELECT * INTO v_from_wallet FROM wallets 
  WHERE store_id = p_from_store_id AND payment_method = p_payment_method;
  
  IF NOT FOUND OR v_from_wallet.balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente');
  END IF;

  -- Debit source
  UPDATE wallets SET balance = balance - p_amount, updated_at = now()
  WHERE id = v_from_wallet.id
  RETURNING balance INTO v_new_from_balance;

  INSERT INTO wallet_transactions (wallet_id, store_id, type, amount, balance_after, description, created_by)
  VALUES (v_from_wallet.id, p_from_store_id, 'transfer_out', p_amount, v_new_from_balance,
          'Transferência para outra loja', auth.uid());

  -- Credit destination
  INSERT INTO wallets (store_id, company_id, payment_method, balance)
  VALUES (p_to_store_id, v_company_id, p_payment_method, p_amount)
  ON CONFLICT (store_id, payment_method)
  DO UPDATE SET balance = wallets.balance + p_amount, updated_at = now()
  RETURNING id, balance INTO v_to_wallet_id, v_new_to_balance;

  INSERT INTO wallet_transactions (wallet_id, store_id, type, amount, balance_after, description, created_by)
  VALUES (v_to_wallet_id, p_to_store_id, 'transfer_in', p_amount, v_new_to_balance,
          'Transferência recebida', auth.uid());

  RETURN json_build_object('success', true, 'message', 'Transferência realizada com sucesso');
END;
$$;
