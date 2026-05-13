CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id uuid, p_store_id uuid, p_quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_company_id UUID;
BEGIN
    -- Get company_id from product
    SELECT company_id INTO v_company_id FROM public.products WHERE id = p_product_id;
    
    -- Record as movement to maintain consistency
    -- If p_quantity is positive (standard case for decrement), we record it as a negative quantity movement
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
        'ADJUSTMENT',
        -p_quantity,
        'LEGACY_RPC_DECREMENT',
        NULL,
        auth.uid()
    );
END;
$function$;
