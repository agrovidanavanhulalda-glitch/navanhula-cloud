-- 1. Create sequence for SKU generation
CREATE SEQUENCE IF NOT EXISTS public.product_sku_seq START 1;

-- 2. Function to generate SKU
CREATE OR REPLACE FUNCTION public.generate_product_sku()
RETURNS TEXT AS $$
BEGIN
    RETURN 'PRD-' || LPAD(nextval('public.product_sku_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Update create_product_with_stock with automatic SKU and better validation
CREATE OR REPLACE FUNCTION public.create_product_with_stock(
    p_name text,
    p_cost_price numeric,
    p_sale_price numeric,
    p_initial_stock integer,
    p_store_id uuid,
    p_company_id uuid,
    p_is_active boolean DEFAULT true,
    p_code text DEFAULT NULL::text,
    p_category_id uuid DEFAULT NULL::uuid,
    p_description text DEFAULT NULL::text,
    p_image_url text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product_id uuid;
    v_result jsonb;
    v_branch_exists boolean;
    v_company_exists boolean;
    v_final_code text;
BEGIN
    -- 1. Validation
    IF p_name IS NULL OR p_name = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nome do produto é obrigatório');
    END IF;

    IF p_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ID da empresa é obrigatório');
    END IF;

    -- Handle SKU generation
    IF p_code IS NULL OR p_code = '' THEN
        v_final_code := public.generate_product_sku();
    ELSE
        v_final_code := p_code;
    END IF;

    -- Verify company exists
    SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_company_id) INTO v_company_exists;
    IF NOT v_company_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada');
    END IF;

    -- Verify store/branch exists if initial stock is provided
    IF p_initial_stock > 0 AND p_store_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM public.stores WHERE id = p_store_id AND company_id = p_company_id) INTO v_branch_exists;
        
        IF NOT v_branch_exists THEN
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
        v_final_code,
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

    -- 3. Handle Initial Stock via Inventory Movement
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
        'code', v_final_code,
        'initial_stock', p_initial_stock
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$function$;

-- 4. Defense in depth: Trigger to ensure code is NEVER null on products
CREATE OR REPLACE FUNCTION public.ensure_product_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := public.generate_product_sku();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_product_code ON public.products;
CREATE TRIGGER trg_ensure_product_code
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.ensure_product_code();
