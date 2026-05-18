-- Add notes column to inventory_movements if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'notes') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Drop existing functions to avoid conflicts with multiple signatures
DROP FUNCTION IF EXISTS public.add_inventory_adjustment(uuid, uuid, integer, text, text);
DROP FUNCTION IF EXISTS public.add_inventory_adjustment(uuid, uuid, integer, text, text, text, uuid);

-- Re-create add_inventory_adjustment with a single, robust signature
CREATE OR REPLACE FUNCTION public.add_inventory_adjustment(
    p_product_id uuid, 
    p_store_id uuid, 
    p_quantity integer, 
    p_type text, 
    p_reason text DEFAULT NULL,
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

    -- Record the movement (trigger tr_process_inventory_movement will update product_stock)
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

-- Create atomic RPC for product creation with stock
CREATE OR REPLACE FUNCTION public.create_product_with_stock(
    p_name text,
    p_cost_price numeric,
    p_sale_price numeric,
    p_initial_stock integer,
    p_store_id uuid,
    p_company_id uuid,
    p_is_active boolean DEFAULT true,
    p_code text DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_image_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id uuid;
    v_result json;
    v_code text;
    v_user_company_id uuid;
BEGIN
    -- Get user company for security check
    v_user_company_id := get_user_company_id();

    -- Validation
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'O nome do produto é obrigatório.';
    END IF;

    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'O ID da empresa é obrigatório.';
    END IF;

    -- Security Check: Ensure user belongs to the company OR is master owner
    IF NOT is_master_owner() AND p_company_id != v_user_company_id THEN
        RAISE EXCEPTION 'Acesso negado: Você não pertence a esta empresa.';
    END IF;

    -- Generate code if not provided
    IF p_code IS NULL OR trim(p_code) = '' THEN
        v_code := 'P-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    ELSE
        v_code := p_code;
    END IF;

    -- 1. Insert Product
    INSERT INTO public.products (
        name,
        cost_price,
        sale_price,
        is_active,
        company_id,
        code,
        category_id,
        description,
        image_url,
        created_by
    ) VALUES (
        trim(p_name),
        COALESCE(p_cost_price, 0),
        COALESCE(p_sale_price, 0),
        COALESCE(p_is_active, true),
        p_company_id,
        v_code,
        p_category_id,
        p_description,
        p_image_url,
        auth.uid()
    ) RETURNING id INTO v_product_id;

    -- 2. Insert Initial Stock if provided and store is valid
    IF p_initial_stock IS NOT NULL AND p_initial_stock > 0 AND p_store_id IS NOT NULL THEN
        PERFORM public.add_inventory_adjustment(
            v_product_id,
            p_store_id,
            p_initial_stock,
            'ENTRY',
            'Criação inicial do produto',
            'INITIAL_STOCK',
            NULL
        );
    END IF;

    -- 3. Prepare result
    SELECT row_to_json(p.*) INTO v_result
    FROM public.products p
    WHERE p.id = v_product_id;

    RETURN v_result;
END;
$$;