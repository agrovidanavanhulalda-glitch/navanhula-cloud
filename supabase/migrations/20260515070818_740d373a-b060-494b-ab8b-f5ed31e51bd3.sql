-- Ensure product_stock table has the necessary columns and indexes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_stock_composite') THEN
        CREATE UNIQUE INDEX idx_product_stock_composite ON public.product_stock (product_id, store_id);
    END IF;
END $$;

-- Table to store high-level inventory movements
-- (Assuming it already exists, but ensuring constraints)
ALTER TABLE IF EXISTS public.inventory_movements 
  ALTER COLUMN company_id SET NOT NULL,
  ALTER COLUMN branch_id SET NOT NULL,
  ALTER COLUMN product_id SET NOT NULL,
  ALTER COLUMN movement_type SET NOT NULL,
  ALTER COLUMN quantity SET NOT NULL;

-- Function to handle inventory movements and update stock cache
CREATE OR REPLACE FUNCTION public.process_inventory_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_current_qty INTEGER;
    v_product_name TEXT;
BEGIN
    -- 1. Validation
    IF NEW.branch_id IS NULL THEN
        RAISE EXCEPTION 'branch_id (loja) é obrigatório para movimentos de inventário';
    END IF;

    -- 2. Ensure stock record exists for this product/branch
    INSERT INTO public.product_stock (product_id, store_id, quantity, company_id, created_by)
    VALUES (NEW.product_id, NEW.branch_id, 0, NEW.company_id, NEW.created_by)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    -- 3. Lock the row to prevent race conditions during update
    SELECT quantity INTO v_current_qty
    FROM public.product_stock
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id
    FOR UPDATE;

    -- 4. Check for negative stock
    IF (COALESCE(v_current_qty, 0) + NEW.quantity) < 0 THEN
        SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
        RAISE EXCEPTION 'Stock insuficiente para "%". Disponível: %, Necessário: %', 
            COALESCE(v_product_name, 'Produto'), 
            COALESCE(v_current_qty, 0), 
            ABS(NEW.quantity);
    END IF;

    -- 5. Update the stock cache
    UPDATE public.product_stock
    SET quantity = quantity + NEW.quantity,
        updated_at = now()
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id;

    RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS tr_process_inventory_movement ON public.inventory_movements;
CREATE TRIGGER tr_process_inventory_movement
AFTER INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.process_inventory_movement();

-- Refine add_inventory_adjustment RPC
CREATE OR REPLACE FUNCTION public.add_inventory_adjustment(
    p_product_id uuid, 
    p_store_id uuid, 
    p_quantity integer, 
    p_type text, 
    p_reason text DEFAULT NULL::text,
    p_reference_type text DEFAULT 'MANUAL_ADJUSTMENT',
    p_reference_id uuid DEFAULT NULL
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_company_id UUID;
BEGIN
    -- Get company_id from the product
    SELECT company_id INTO v_company_id FROM public.products WHERE id = p_product_id;
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Produto não encontrado ou empresa não identificada.';
    END IF;

    IF p_store_id IS NULL THEN
        RAISE EXCEPTION 'ID da loja (store_id) é obrigatório.';
    END IF;

    -- Record the movement (trigger will update product_stock)
    INSERT INTO public.inventory_movements (
        company_id,
        branch_id,
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        created_by,
        notes
    ) VALUES (
        v_company_id,
        p_store_id,
        p_product_id,
        UPPER(COALESCE(p_type, 'ADJUSTMENT')),
        p_quantity,
        p_reference_type,
        p_reference_id,
        auth.uid(),
        p_reason
    );
END;
$function$;
