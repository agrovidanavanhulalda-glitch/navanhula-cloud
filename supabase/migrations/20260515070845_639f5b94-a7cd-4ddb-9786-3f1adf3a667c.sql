-- Function to automatically record inventory movement on sale
CREATE OR REPLACE FUNCTION public.handle_sale_item_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_company_id UUID;
    v_store_id UUID;
    v_product_exists BOOLEAN;
BEGIN
    -- Only process if product_id is provided
    IF NEW.product_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get store_id and company_id from the parent sale
    SELECT store_id INTO v_store_id FROM public.sales WHERE id = NEW.sale_id;
    SELECT company_id INTO v_company_id FROM public.products WHERE id = NEW.product_id;

    -- Safety checks
    IF v_store_id IS NULL OR v_company_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível determinar a loja ou empresa para a venda.';
    END IF;

    -- Record the movement (this will trigger process_inventory_movement to update product_stock)
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
        v_store_id,
        NEW.product_id,
        'SALE',
        -NEW.quantity, -- Negative for sales
        'SALE',
        NEW.sale_id,
        (SELECT user_id FROM public.sales WHERE id = NEW.sale_id),
        'Venda automática'
    );

    RETURN NEW;
END;
$function$;

-- Ensure trigger exists on sale_items
DROP TRIGGER IF EXISTS tr_handle_sale_item_stock ON public.sale_items;
CREATE TRIGGER tr_handle_sale_item_stock
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.handle_sale_item_stock();
