-- 1. Hardening add_inventory_adjustment
CREATE OR REPLACE FUNCTION public.add_inventory_adjustment(p_product_id uuid, p_store_id uuid, p_quantity integer, p_type text, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_company_id UUID;
BEGIN
    -- Try to get company_id from the product first
    SELECT company_id INTO v_company_id FROM public.products WHERE id = p_product_id;
    
    -- Fallback to user profile if not on product
    IF v_company_id IS NULL THEN
        SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
    END IF;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível determinar a empresa para este movimento.';
    END IF;

    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'ID da loja (store_id) é obrigatório.';
    END IF;

    INSERT INTO public.inventory_movements (
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
        COALESCE(p_type, 'ADJUSTMENT'),
        p_quantity,
        'MANUAL_ADJUSTMENT',
        NULL,
        auth.uid()
    );
END;
$function$;

-- 2. Consolidate trigger logic for better error reporting
CREATE OR REPLACE FUNCTION public.process_inventory_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_current_qty INTEGER;
    v_product_name TEXT;
BEGIN
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

    -- Prevent negative stock
    IF (COALESCE(v_current_qty, 0) + NEW.quantity) < 0 THEN
        SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
        RAISE EXCEPTION 'Estoque insuficiente para "%". Disponível: %, Necessário: %', 
            COALESCE(v_product_name, 'Produto'), 
            COALESCE(v_current_qty, 0), 
            ABS(NEW.quantity);
    END IF;

    -- Update cache
    UPDATE public.product_stock
    SET quantity = quantity + NEW.quantity,
        updated_at = now()
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id;

    RETURN NEW;
END;
$function$;
