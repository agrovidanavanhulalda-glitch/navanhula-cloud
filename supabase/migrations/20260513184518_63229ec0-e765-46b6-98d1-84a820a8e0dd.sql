-- Update record_stock_movement to use new system
CREATE OR REPLACE FUNCTION public.record_stock_movement(
    p_product_id uuid, 
    p_store_id uuid, 
    p_type text, 
    p_quantity integer, 
    p_unit_cost numeric DEFAULT 0, 
    p_reference_type text DEFAULT 'manual'::text, 
    p_reference_id uuid DEFAULT NULL::uuid, 
    p_reason text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id UUID;
  v_current_qty INTEGER;
  v_mapped_type TEXT;
  v_signed_qty INTEGER;
BEGIN
  -- Get company
  v_company_id := public.get_user_company(auth.uid());
  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Empresa não encontrada');
  END IF;

  -- Map old types to new types
  IF p_type = 'entrada' THEN
    v_mapped_type := 'ENTRY';
    v_signed_qty := p_quantity;
  ELSIF p_type = 'saida' THEN
    v_mapped_type := 'ADJUSTMENT'; -- Or SALE if appropriate, but manual saídas are adjustments
    v_signed_qty := -p_quantity;
  ELSIF p_type = 'ajuste' THEN
    v_mapped_type := 'ADJUSTMENT';
    -- For 'ajuste' (set), we need to calculate the difference
    SELECT COALESCE(quantity, 0) INTO v_current_qty FROM product_stock WHERE product_id = p_product_id AND store_id = p_store_id;
    v_signed_qty := p_quantity - v_current_qty;
  ELSE
    RETURN json_build_object('success', false, 'message', 'Tipo inválido: ' || p_type);
  END IF;

  -- Insert into new movements table
  -- The trigger tr_process_inventory_movement will update product_stock and check for negative stock
  BEGIN
      INSERT INTO inventory_movements (
        company_id,
        branch_id,
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        created_by
      ) VALUES (
        v_company_id,
        p_store_id,
        p_product_id,
        v_mapped_type,
        v_signed_qty,
        p_reference_type,
        p_reference_id,
        auth.uid()
      );
  EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'message', SQLERRM);
  END;

  -- Get updated stock for the response
  SELECT quantity INTO v_current_qty FROM product_stock WHERE product_id = p_product_id AND store_id = p_store_id;

  RETURN json_build_object(
    'success', true,
    'new_stock', v_current_qty
  );
END;
$function$;

-- Update confirm_stock_transfer to use new system
CREATE OR REPLACE FUNCTION public.confirm_stock_transfer(p_transfer_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_transfer FROM stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Transferência não encontrada');
  END IF;

  IF v_transfer.to_salesman_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'message', 'Esta transferência não pertence a si');
  END IF;

  IF v_transfer.status != 'PENDING' THEN
    RETURN json_build_object('success', false, 'message', 'Transferência já processada');
  END IF;

  FOR v_item IN SELECT * FROM stock_transfer_items WHERE transfer_id = p_transfer_id
  LOOP
    -- Logic for salesman stock? 
    -- If we use the same architecture, we should treat salesman_stock as a special kind of store/branch.
    -- But since salesman_stock is a separate table, let's keep it but ensure a movement is recorded.
    
    INSERT INTO inventory_movements (
        company_id,
        branch_id, -- Using the admin's main store as source? 
        -- Actually, a transfer is FROM a store TO a salesman.
        -- We need to deduct from the store and add to the salesman.
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        created_by
    ) VALUES (
        v_transfer.company_id,
        (SELECT id FROM stores WHERE company_id = v_transfer.company_id AND is_active = true LIMIT 1), -- Fallback to first store
        v_item.product_id,
        'TRANSFER',
        -v_item.quantity, -- Deduct from main store
        'TRANSFER_OUT',
        p_transfer_id,
        auth.uid()
    );

    -- Update salesman_stock (the target)
    INSERT INTO salesman_stock (salesman_id, product_id, company_id, quantity)
    VALUES (v_transfer.to_salesman_id, v_item.product_id, v_transfer.company_id, v_item.quantity)
    ON CONFLICT (salesman_id, product_id)
    DO UPDATE SET quantity = salesman_stock.quantity + v_item.quantity, updated_at = now();

  END LOOP;

  UPDATE stock_transfers
  SET status = 'CONFIRMED', confirmed_at = now(), confirmed_by = auth.uid()
  WHERE id = p_transfer_id;

  RETURN json_build_object('success', true, 'message', 'Transferência confirmada');
END;
$function$;

-- Update force_confirm_stock_transfer
CREATE OR REPLACE FUNCTION public.force_confirm_stock_transfer(p_transfer_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer RECORD;
  v_item RECORD;
BEGIN
  IF NOT is_manager_or_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissão');
  END IF;

  SELECT * INTO v_transfer FROM stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Transferência não encontrada');
  END IF;

  IF v_transfer.status != 'PENDING' THEN
    RETURN json_build_object('success', false, 'message', 'Transferência já processada');
  END IF;

  FOR v_item IN SELECT * FROM stock_transfer_items WHERE transfer_id = p_transfer_id
  LOOP
    INSERT INTO inventory_movements (
        company_id,
        branch_id,
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        created_by
    ) VALUES (
        v_transfer.company_id,
        (SELECT id FROM stores WHERE company_id = v_transfer.company_id AND is_active = true LIMIT 1),
        v_item.product_id,
        'TRANSFER',
        -v_item.quantity,
        'TRANSFER_OUT_FORCED',
        p_transfer_id,
        auth.uid()
    );

    INSERT INTO salesman_stock (salesman_id, product_id, company_id, quantity)
    VALUES (v_transfer.to_salesman_id, v_item.product_id, v_transfer.company_id, v_item.quantity)
    ON CONFLICT (salesman_id, product_id)
    DO UPDATE SET quantity = salesman_stock.quantity + v_item.quantity, updated_at = now();
  END LOOP;

  UPDATE stock_transfers
  SET status = 'FORCED_CONFIRMED', confirmed_at = now(), confirmed_by = auth.uid()
  WHERE id = p_transfer_id;

  RETURN json_build_object('success', true, 'message', 'Transferência forçada com sucesso');
END;
$function$;
