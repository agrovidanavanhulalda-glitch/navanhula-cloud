
-- RPC: place agro order with atomic stock decrement
CREATE OR REPLACE FUNCTION public.place_agro_order(
  p_company_id uuid,
  p_producer_id uuid,
  p_cliente_nome text,
  p_cliente_contacto text,
  p_quantidade integer,
  p_created_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_producer agro_producers%ROWTYPE;
  v_total numeric;
  v_order_id uuid;
BEGIN
  -- Lock the producer row
  SELECT * INTO v_producer
  FROM agro_producers
  WHERE id = p_producer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Produtor não encontrado');
  END IF;

  IF v_producer.status != 'ativo' THEN
    RETURN json_build_object('success', false, 'message', 'Produtor inativo');
  END IF;

  IF p_quantidade > v_producer.quantidade_disponivel THEN
    RETURN json_build_object('success', false, 'message', 'Quantidade indisponível. Disponível: ' || v_producer.quantidade_disponivel);
  END IF;

  IF p_quantidade < 1 THEN
    RETURN json_build_object('success', false, 'message', 'Quantidade mínima é 1');
  END IF;

  v_total := p_quantidade * v_producer.preco;

  -- Decrement stock
  UPDATE agro_producers
  SET quantidade_disponivel = quantidade_disponivel - p_quantidade,
      updated_at = now()
  WHERE id = p_producer_id;

  -- Create order
  INSERT INTO agro_orders (company_id, producer_id, cliente_nome, cliente_contacto, quantidade, preco_unitario, total, status, created_by)
  VALUES (p_company_id, p_producer_id, trim(p_cliente_nome), trim(p_cliente_contacto), p_quantidade, v_producer.preco, v_total, 'pendente', p_created_by)
  RETURNING id INTO v_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'total', v_total,
    'remaining_stock', v_producer.quantidade_disponivel - p_quantidade
  );
END;
$$;

-- RPC: update agro order status with stock restore on cancel
CREATE OR REPLACE FUNCTION public.update_agro_order_status(
  p_order_id uuid,
  p_new_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order agro_orders%ROWTYPE;
  v_valid_statuses text[] := ARRAY['pendente','confirmado','em_transporte','entregue','cancelado'];
BEGIN
  IF NOT (p_new_status = ANY(v_valid_statuses)) THEN
    RETURN json_build_object('success', false, 'message', 'Status inválido');
  END IF;

  SELECT * INTO v_order FROM agro_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Pedido não encontrado');
  END IF;

  -- Prevent changing from terminal states
  IF v_order.status IN ('entregue', 'cancelado') THEN
    RETURN json_build_object('success', false, 'message', 'Pedido já finalizado');
  END IF;

  -- Restore stock on cancel
  IF p_new_status = 'cancelado' THEN
    UPDATE agro_producers
    SET quantidade_disponivel = quantidade_disponivel + v_order.quantidade,
        updated_at = now()
    WHERE id = v_order.producer_id;
  END IF;

  UPDATE agro_orders
  SET status = p_new_status, updated_at = now()
  WHERE id = p_order_id;

  RETURN json_build_object('success', true, 'order_id', p_order_id, 'status', p_new_status);
END;
$$;
