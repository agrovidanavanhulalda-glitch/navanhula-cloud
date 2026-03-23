
-- Fix the trigger that's causing sale_items inserts to fail
-- The trigger crashes on NULL product_id (manual items) and missing product_stock rows
CREATE OR REPLACE FUNCTION public.update_stock_after_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Skip stock update for manual items (NULL product_id)
    IF NEW.product_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Only update if product_stock row exists
    UPDATE public.product_stock
    SET quantity = GREATEST(0, COALESCE(quantity, 0) - NEW.quantity),
        updated_at = now()
    WHERE product_id = NEW.product_id
    AND store_id = (SELECT store_id FROM public.sales WHERE id = NEW.sale_id);
    
    RETURN NEW;
END;
$$;

-- Also fix the last_sale_date trigger to handle NULL product_id
CREATE OR REPLACE FUNCTION public.update_last_sale_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.product_id IS NOT NULL THEN
        UPDATE public.products
        SET last_sale_date = now()
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$;
