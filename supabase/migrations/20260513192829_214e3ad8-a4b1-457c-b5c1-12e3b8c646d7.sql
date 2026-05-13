-- 1. Remove redundant triggers that cause double deductions
DROP TRIGGER IF EXISTS update_stock_on_sale_trigger ON public.sale_items;
DROP TRIGGER IF EXISTS tr_restore_stock_on_cancel ON public.sales;

-- 2. Ensure only ONE trigger handles stock from sales
-- We keep 'tr_sale_item_to_inventory_movement' on sale_items
-- We keep 'tr_sale_cancellation_to_inventory_movement' on sales

-- 3. Consolidate process_inventory_movement trigger function
CREATE OR REPLACE FUNCTION public.process_inventory_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_current_qty INTEGER;
BEGIN
    -- Ensure company_id is set
    IF NEW.company_id IS NULL THEN
        NEW.company_id := (SELECT company_id FROM public.products WHERE id = NEW.product_id);
    END IF;

    -- Ensure branch_id is set
    IF NEW.branch_id IS NULL THEN
        RAISE EXCEPTION 'branch_id is required for inventory movements';
    END IF;

    -- Initialize stock if doesn't exist
    INSERT INTO public.product_stock (product_id, store_id, quantity, company_id, created_by)
    VALUES (NEW.product_id, NEW.branch_id, 0, NEW.company_id, NEW.created_by)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    -- Get current stock WITH LOCK to prevent race conditions
    SELECT quantity INTO v_current_qty
    FROM public.product_stock
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id
    FOR UPDATE;

    -- Prevent negative stock for sales and adjustments out
    IF (v_current_qty + NEW.quantity) < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto. Disponível: %, Solicitado: %', v_current_qty, ABS(NEW.quantity);
    END IF;

    -- Update cache
    UPDATE public.product_stock
    SET quantity = quantity + NEW.quantity,
        updated_at = now()
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id;

    RETURN NEW;
END;
$function$;

-- 4. Update the RPC to use the consolidated logic
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
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Get company
  SELECT company_id INTO v_company_id FROM public.products WHERE id = p_product_id;
  
  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Produto não encontrado ou sem empresa associada');
  END IF;

  -- Map old types to new types
  IF p_type = 'entrada' THEN
    v_mapped_type := 'ENTRY';
    v_signed_qty := p_quantity;
  ELSIF p_type = 'saida' THEN
    v_mapped_type := 'ADJUSTMENT';
    v_signed_qty := -p_quantity;
  ELSIF p_type = 'ajuste' THEN
    v_mapped_type := 'ADJUSTMENT';
    -- For 'ajuste' (set), we need to calculate the difference
    SELECT COALESCE(quantity, 0) INTO v_current_qty FROM product_stock WHERE product_id = p_product_id AND store_id = p_store_id;
    v_signed_qty := p_quantity - COALESCE(v_current_qty, 0);
  ELSE
    v_mapped_type := p_type; -- Accept direct types like 'SALE', 'TRANSFER', etc.
    v_signed_qty := p_quantity;
  END IF;

  -- Insert into movements table (trigger will handle the rest)
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
        v_user_id
      );

      -- Get new stock level
      SELECT quantity INTO v_current_qty FROM product_stock WHERE product_id = p_product_id AND store_id = p_store_id;

      RETURN json_build_object(
        'success', true, 
        'message', 'Estoque atualizado com sucesso',
        'new_stock', v_current_qty
      );
  EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'message', SQLERRM);
  END;
END;
$function$;

-- 5. Update decrement_product_stock to use the unified flow
CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id uuid, p_store_id uuid, p_quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM public.products WHERE id = p_product_id;

    INSERT INTO public.inventory_movements (
        company_id,
        branch_id,
        product_id,
        movement_type,
        quantity,
        reference_type,
        created_by
    ) VALUES (
        v_company_id,
        p_store_id,
        p_product_id,
        'ADJUSTMENT',
        -p_quantity,
        'LEGACY_RPC_DECREMENT',
        auth.uid()
    );
END;
$function$;

-- 6. Refine RLS for inventory_movements
DROP POLICY IF EXISTS "Managers can manage movements" ON inventory_movements;
DROP POLICY IF EXISTS "Users can insert movements of their company" ON inventory_movements;
DROP POLICY IF EXISTS "Users can view movements of their company" ON inventory_movements;

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_movements_isolation_select" ON inventory_movements
    FOR SELECT TO authenticated
    USING (is_master_owner() OR company_id = get_user_company_id());

CREATE POLICY "inventory_movements_isolation_insert" ON inventory_movements
    FOR INSERT TO authenticated
    WITH CHECK (is_master_owner() OR company_id = get_user_company_id());

-- 7. Ensure product_stock also has clean RLS
DROP POLICY IF EXISTS "standard_isolation" ON product_stock;
DROP POLICY IF EXISTS "Users can manage stock of their company" ON product_stock;
DROP POLICY IF EXISTS "Users can view stock of their company" ON product_stock;

ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_stock_isolation_select" ON product_stock
    FOR SELECT TO authenticated
    USING (is_master_owner() OR company_id = get_user_company_id());

CREATE POLICY "product_stock_isolation_all" ON product_stock
    FOR ALL TO authenticated
    USING (is_master_owner() OR company_id = get_user_company_id())
    WITH CHECK (is_master_owner() OR company_id = get_user_company_id());

-- 8. Final consistency check: Recalculate stock for all products (Optional but recommended)
-- This might be too heavy if there are millions of rows, but for standard enterprise it's fine.
-- For now, we trust the new trigger to maintain consistency going forward.
