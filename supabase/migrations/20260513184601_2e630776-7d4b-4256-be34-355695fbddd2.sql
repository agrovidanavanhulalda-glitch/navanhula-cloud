CREATE OR REPLACE FUNCTION public.process_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_current_qty INTEGER;
BEGIN
    -- Initialize stock if doesn't exist
    INSERT INTO public.product_stock (product_id, store_id, quantity, company_id)
    VALUES (NEW.product_id, NEW.branch_id, 0, NEW.company_id)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    -- Get current stock WITH LOCK to prevent race conditions
    SELECT quantity INTO v_current_qty 
    FROM public.product_stock 
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id
    FOR UPDATE;

    -- Prevent negative stock
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
