-- 1. Standardize movement_type constraint
ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

-- First, update any existing 'LOSS' to 'ADJUSTMENT' (though constraint should have blocked it)
UPDATE public.inventory_movements SET movement_type = 'ADJUSTMENT' WHERE movement_type = 'LOSS';

ALTER TABLE public.inventory_movements 
ADD CONSTRAINT inventory_movements_movement_type_check 
CHECK (movement_type IN ('ENTRY', 'SALE', 'TRANSFER', 'RETURN', 'ADJUSTMENT'));

-- 2. Clean up redundant triggers on sale_items
DROP TRIGGER IF EXISTS tr_sale_item_to_inventory_movement ON public.sale_items;

-- 3. Improve add_inventory_adjustment to be more robust
-- We need to drop it first because we are changing the return type to JSONB
DROP FUNCTION IF EXISTS public.add_inventory_adjustment(uuid, uuid, integer, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.add_inventory_adjustment(
    p_product_id UUID,
    p_store_id UUID,
    p_quantity INTEGER,
    p_type TEXT DEFAULT 'ADJUSTMENT',
    p_reason TEXT DEFAULT NULL,
    p_reference_type TEXT DEFAULT 'MANUAL',
    p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
    v_final_type TEXT;
    v_new_stock INTEGER;
BEGIN
    -- 1. Get company_id from the product
    SELECT company_id INTO v_company_id FROM public.products WHERE id = p_product_id;
    
    IF v_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Produto não encontrado ou empresa não identificada.');
    END IF;

    -- 2. Normalize and validate type
    v_final_type := UPPER(COALESCE(p_type, 'ADJUSTMENT'));
    
    -- Map common invalid values to valid ones
    IF v_final_type = 'LOSS' OR v_final_type = 'OUT' THEN
        v_final_type := 'ADJUSTMENT';
    ELSIF v_final_type = 'IN' THEN
        v_final_type := 'ENTRY';
    END IF;

    -- Final validation against constraint list
    IF v_final_type NOT IN ('ENTRY', 'SALE', 'TRANSFER', 'RETURN', 'ADJUSTMENT') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tipo de movimento inválido: ' || v_final_type);
    END IF;

    -- 3. Record the movement
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
        v_final_type,
        p_quantity,
        COALESCE(p_reference_type, 'MANUAL_ADJUSTMENT'),
        p_reference_id,
        auth.uid(),
        p_reason
    );

    -- 4. Get new stock level to return to frontend
    SELECT quantity INTO v_new_stock 
    FROM public.product_stock 
    WHERE product_id = p_product_id AND store_id = p_store_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Movimento registrado com sucesso',
        'new_stock', COALESCE(v_new_stock, 0)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4. Ensure create_product_with_stock is robust and uses atomic transaction
-- Drop all variants to be sure
DROP FUNCTION IF EXISTS public.create_product_with_stock(text, numeric, numeric, integer, uuid, uuid, boolean, text, text, uuid, text);
DROP FUNCTION IF EXISTS public.create_product_with_stock(text, numeric, numeric, integer, uuid, uuid, boolean, text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_product_with_stock(
    p_name text,
    p_cost_price numeric,
    p_sale_price numeric,
    p_initial_stock integer,
    p_store_id uuid,
    p_company_id uuid,
    p_is_active boolean DEFAULT true,
    p_image_url text DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_code text DEFAULT NULL,
    p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product_id uuid;
    v_final_code text;
    v_user_id uuid := auth.uid();
BEGIN
    -- Validations
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nome do produto é obrigatório');
    END IF;

    IF p_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ID da empresa é obrigatório');
    END IF;

    -- SKU Generation
    IF p_code IS NULL OR trim(p_code) = '' THEN
        v_final_code := public.generate_product_sku();
    ELSE
        v_final_code := trim(p_code);
    END IF;

    -- Insert Product
    INSERT INTO public.products (
        name, code, cost_price, sale_price, company_id, 
        category_id, description, image_url, is_active, 
        created_by
    ) VALUES (
        trim(p_name), v_final_code, COALESCE(p_cost_price, 0), 
        COALESCE(p_sale_price, 0), p_company_id, 
        p_category_id, p_description, p_image_url, 
        COALESCE(p_is_active, true), v_user_id
    ) RETURNING id INTO v_product_id;

    -- Initial Stock
    IF p_store_id IS NOT NULL THEN
        -- Ensure stock record exists
        INSERT INTO public.product_stock (product_id, store_id, quantity, company_id, created_by)
        VALUES (v_product_id, p_store_id, 0, p_company_id, v_user_id)
        ON CONFLICT (product_id, store_id) DO NOTHING;

        -- Record movement if stock > 0
        IF p_initial_stock > 0 THEN
            INSERT INTO public.inventory_movements (
                product_id, branch_id, company_id, movement_type, 
                quantity, reference_type, notes, created_by
            ) VALUES (
                v_product_id, p_store_id, p_company_id, 'ENTRY', 
                p_initial_stock, 'INITIAL_LOAD', 
                'Stock inicial na criação do produto', v_user_id
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'id', v_product_id, 
        'message', 'Produto criado com sucesso!',
        'sku', v_final_code
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Add index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref ON public.inventory_movements(reference_type, reference_id);
