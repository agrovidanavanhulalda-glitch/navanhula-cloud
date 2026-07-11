
CREATE OR REPLACE FUNCTION public.pos_complete_sale(
  p_store_id uuid,
  p_cash_register_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_subtotal numeric,
  p_discount_amount numeric DEFAULT 0,
  p_discount_percent numeric DEFAULT 0,
  p_total numeric DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_seller_name text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_voucher_code text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_sale_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_available integer;
  v_voucher_id uuid;
  v_voucher_amount numeric;
  v_cost_total numeric := 0;
  v_profit numeric := 0;
  v_total numeric;
  v_payment payment_method;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: utilizador não autenticado';
  END IF;

  SELECT company_id INTO v_company_id FROM profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'COMPANY_REQUIRED: perfil sem empresa vinculada';
  END IF;

  IF p_store_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM stores WHERE id = p_store_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'STORE_INVALID: loja não pertence à empresa';
  END IF;

  BEGIN
    v_payment := p_payment_method::payment_method;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'PAYMENT_INVALID: método de pagamento % inválido', p_payment_method;
  END;

  IF v_payment = 'cash' THEN
    IF p_cash_register_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM cash_registers
      WHERE id = p_cash_register_id AND status = 'open' AND store_id = p_store_id
    ) THEN
      RAISE EXCEPTION 'CASH_REGISTER_CLOSED: nenhum caixa aberto para esta loja';
    END IF;
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ITEMS_REQUIRED: venda sem itens';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := NULLIF(v_item->>'product_id','')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'QUANTITY_INVALID: quantidade inválida em item';
    END IF;
    IF v_product_id IS NOT NULL THEN
      SELECT quantity INTO v_available
      FROM product_stock
      WHERE product_id = v_product_id AND store_id = p_store_id
      FOR UPDATE;
      IF v_available IS NULL OR v_available < v_qty THEN
        RAISE EXCEPTION 'STOCK_INSUFFICIENT: stock insuficiente para produto %', v_product_id;
      END IF;
    END IF;
    v_cost_total := v_cost_total + (COALESCE((v_item->>'cost_price')::numeric, 0) * v_qty);
  END LOOP;

  IF p_voucher_code IS NOT NULL AND length(p_voucher_code) > 0 THEN
    SELECT id, amount INTO v_voucher_id, v_voucher_amount
    FROM payment_vouchers
    WHERE code = p_voucher_code
      AND status = 'pending'::voucher_status
      AND expires_at > now()
    FOR UPDATE;
    IF v_voucher_id IS NULL THEN
      RAISE EXCEPTION 'VOUCHER_INVALID: voucher inválido, expirado ou já utilizado';
    END IF;
  END IF;

  v_total := COALESCE(p_total, p_subtotal - COALESCE(p_discount_amount,0));
  v_profit := v_total - v_cost_total;

  INSERT INTO sales (
    store_id, user_id, cash_register_id, company_id, created_by,
    subtotal, discount_amount, discount_percent, total,
    payment_method, status, customer_name, customer_phone,
    seller_name, notes, cost_total, profit, synced
  ) VALUES (
    p_store_id, v_user_id, p_cash_register_id, v_company_id, v_user_id,
    p_subtotal, COALESCE(p_discount_amount,0), COALESCE(p_discount_percent,0), v_total,
    v_payment, 'completed'::sale_status, p_customer_name, p_customer_phone,
    p_seller_name, p_notes, v_cost_total, v_profit, true
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO sale_items (
      sale_id, product_id, product_name, quantity, unit_price,
      cost_price, discount_amount, total, company_id, created_by
    ) VALUES (
      v_sale_id,
      NULLIF(v_item->>'product_id','')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric,
      COALESCE((v_item->>'cost_price')::numeric, 0),
      COALESCE((v_item->>'discount_amount')::numeric, 0),
      (v_item->>'total')::numeric,
      v_company_id,
      v_user_id
    );
  END LOOP;

  IF v_voucher_id IS NOT NULL THEN
    UPDATE payment_vouchers
    SET status = 'redeemed'::voucher_status,
        redeemed_by = v_user_id,
        redeemed_at = now(),
        sale_id = v_sale_id,
        updated_at = now()
    WHERE id = v_voucher_id;
  END IF;

  IF v_payment = 'cash' AND p_cash_register_id IS NOT NULL THEN
    INSERT INTO cash_movements (
      cash_register_id, type, amount, description, created_by, company_id
    ) VALUES (
      p_cash_register_id, 'in', v_total,
      'Venda PDV #' || substr(v_sale_id::text,1,8),
      v_user_id, v_company_id
    );
  END IF;

  INSERT INTO audit_logs (
    user_id, company_id, store_id, action, table_name, record_id,
    entity_type, entity_id, ip_address, new_data, metadata
  ) VALUES (
    v_user_id, v_company_id, p_store_id, 'sale.completed', 'sales', v_sale_id,
    'sale', v_sale_id, p_ip_address,
    jsonb_build_object(
      'sale_id', v_sale_id,
      'total', v_total,
      'payment_method', p_payment_method,
      'cash_register_id', p_cash_register_id,
      'voucher_id', v_voucher_id
    ),
    jsonb_build_object('source','pos_complete_sale')
  );

  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'total', v_total,
    'profit', v_profit,
    'voucher_redeemed', v_voucher_id IS NOT NULL
  );
END;
$$;
