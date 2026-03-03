
-- Voucher status enum
CREATE TYPE public.voucher_status AS ENUM ('pending', 'redeemed', 'expired', 'cancelled');

-- Payment vouchers table
CREATE TABLE public.payment_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('mpesa', 'emola', 'mkesh')),
  phone_number text,
  customer_name text,
  status voucher_status NOT NULL DEFAULT 'pending',
  store_id uuid REFERENCES public.stores(id),
  redeemed_by uuid,
  redeemed_at timestamp with time zone,
  sale_id uuid REFERENCES public.sales(id),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast code lookups
CREATE INDEX idx_vouchers_code ON public.payment_vouchers(code);
CREATE INDEX idx_vouchers_status ON public.payment_vouchers(status);

-- Enable RLS
ALTER TABLE public.payment_vouchers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view vouchers"
  ON public.payment_vouchers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vouchers"
  ON public.payment_vouchers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vouchers"
  ON public.payment_vouchers FOR UPDATE
  TO authenticated
  USING (true);

-- Add voucher_status to payment_method enum (add 'voucher' option)
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'voucher';

-- Function to validate and redeem a voucher
CREATE OR REPLACE FUNCTION public.validate_and_redeem_voucher(
  p_code text,
  p_store_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_voucher record;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated', 'message', 'Utilizador não autenticado');
  END IF;

  -- Find voucher by code
  SELECT * INTO v_voucher
  FROM public.payment_vouchers
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code));

  -- Not found
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Código de voucher não encontrado');
  END IF;

  -- Already redeemed
  IF v_voucher.status = 'redeemed' THEN
    RETURN json_build_object('success', false, 'error', 'already_redeemed', 'message', 'Este código já foi utilizado');
  END IF;

  -- Cancelled
  IF v_voucher.status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'cancelled', 'message', 'Este código foi cancelado');
  END IF;

  -- Expired
  IF v_voucher.expires_at < now() THEN
    UPDATE public.payment_vouchers SET status = 'expired', updated_at = now() WHERE id = v_voucher.id;
    RETURN json_build_object('success', false, 'error', 'expired', 'message', 'Este código expirou');
  END IF;

  -- Valid! Redeem it
  UPDATE public.payment_vouchers
  SET status = 'redeemed',
      redeemed_by = v_user_id,
      redeemed_at = now(),
      store_id = COALESCE(p_store_id, store_id),
      updated_at = now()
  WHERE id = v_voucher.id;

  RETURN json_build_object(
    'success', true,
    'voucher_id', v_voucher.id,
    'amount', v_voucher.amount,
    'payment_method', v_voucher.payment_method,
    'customer_name', v_voucher.customer_name,
    'phone_number', v_voucher.phone_number,
    'message', 'Voucher validado com sucesso!'
  );
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON public.payment_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
