-- Drop existing function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.create_product_with_stock(text, numeric, numeric, integer, uuid, uuid, boolean, text, uuid, text, text);
DROP FUNCTION IF EXISTS public.create_product_with_stock(text, numeric, numeric, integer, uuid, uuid, boolean, text, uuid, text, text);

-- Create enterprise-grade product creation function
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
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product_id uuid;
    v_result jsonb;
    v_branch_exists boolean;
    v_company_exists boolean;
BEGIN
    -- 1. Validation
    IF p_name IS NULL OR p_name = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nome do produto é obrigatório');
    END IF;

    IF p_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ID da empresa é obrigatório');
    END IF;

    -- Verify company exists
    SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_company_id) INTO v_company_exists;
    IF NOT v_company_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada');
    END IF;

    -- Verify store/branch exists if initial stock is provided
    IF p_initial_stock > 0 AND p_store_id IS NOT NULL THEN
        -- Check in stores or branches table (using stores first as per POS context)
        SELECT EXISTS(SELECT 1 FROM public.stores WHERE id = p_store_id AND company_id = p_company_id) INTO v_branch_exists;
        
        IF NOT v_branch_exists THEN
            -- Try branches table
            SELECT EXISTS(SELECT 1 FROM public.branches WHERE id = p_store_id AND company_id = p_company_id) INTO v_branch_exists;
        END IF;

        IF NOT v_branch_exists THEN
            RETURN jsonb_build_object('success', false, 'error', 'Loja/Filial não encontrada ou não pertence à empresa');
        END IF;
    END IF;

    -- 2. Insert Product
    INSERT INTO public.products (
        name,
        code,
        cost_price,
        sale_price,
        company_id,
        category_id,
        description,
        image_url,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        p_name,
        p_code,
        COALESCE(p_cost_price, 0),
        COALESCE(p_sale_price, 0),
        p_company_id,
        p_category_id,
        p_description,
        p_image_url,
        COALESCE(p_is_active, true),
        now(),
        now()
    ) RETURNING id INTO v_product_id;

    -- 3. Handle Initial Stock via Inventory Movement (Trigger handles product_stock)
    IF p_initial_stock > 0 AND p_store_id IS NOT NULL THEN
        INSERT INTO public.inventory_movements (
            product_id,
            branch_id,
            company_id,
            movement_type,
            quantity,
            reference_type,
            notes,
            created_at
        ) VALUES (
            v_product_id,
            p_store_id,
            p_company_id,
            'in',
            p_initial_stock,
            'initial_load',
            'Stock inicial na criação do produto',
            now()
        );
    END IF;

    -- 4. Success result
    SELECT jsonb_build_object(
        'success', true,
        'id', v_product_id,
        'name', p_name,
        'initial_stock', p_initial_stock
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Fallback for any error
    RETURN jsonb_build_object(
        'success', false, 
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;
