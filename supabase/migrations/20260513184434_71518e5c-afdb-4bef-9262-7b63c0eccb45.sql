-- 1. Create inventory_movements table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    branch_id UUID NOT NULL REFERENCES public.stores(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('ENTRY', 'SALE', 'TRANSFER', 'RETURN', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL, -- We'll store quantity as signed values for easy summing
    reference_type TEXT, -- 'SALE', 'TRANSFER_ORDER', 'ADJUSTMENT_LOG', etc.
    reference_id UUID,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view movements of their company"
ON public.inventory_movements
FOR SELECT
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert movements of their company"
ON public.inventory_movements
FOR INSERT
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Create function to maintain product_stock cache and prevent negative stock
CREATE OR REPLACE FUNCTION public.process_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- Initialize stock if doesn't exist
    INSERT INTO public.product_stock (product_id, store_id, quantity, company_id)
    VALUES (NEW.product_id, NEW.branch_id, 0, NEW.company_id)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    -- Get current stock
    SELECT quantity INTO v_current_stock 
    FROM public.product_stock 
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id;

    -- Prevent negative stock if it's a SALE or negative ADJUSTMENT/TRANSFER
    IF (v_current_stock + NEW.quantity) < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto. Disponível: %, Solicitado: %', v_current_stock, NEW.quantity;
    END IF;

    -- Update cache
    UPDATE public.product_stock
    SET quantity = quantity + NEW.quantity,
        updated_at = now()
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger on inventory_movements
CREATE TRIGGER tr_process_inventory_movement
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.process_inventory_movement();

-- 6. Clean up old triggers that cause double deduction
DROP TRIGGER IF EXISTS tr_update_stock_on_sale_item ON public.sale_items;
DROP TRIGGER IF EXISTS update_stock_on_sale ON public.sale_items;

-- 7. Create trigger to automatically insert movement on sale_items
CREATE OR REPLACE FUNCTION public.handle_sale_item_to_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_store_id UUID;
    v_created_by UUID;
BEGIN
    -- Get sale info
    SELECT company_id, store_id, created_by 
    INTO v_company_id, v_store_id, v_created_by 
    FROM public.sales 
    WHERE id = NEW.sale_id;

    IF NEW.product_id IS NOT NULL THEN
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
            v_store_id,
            NEW.product_id,
            'SALE',
            -NEW.quantity, -- Negative for sales
            'SALE',
            NEW.sale_id,
            v_created_by
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_sale_item_to_inventory_movement
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_sale_item_to_movement();

-- 8. Create trigger to handle sale cancellation (restore stock)
CREATE OR REPLACE FUNCTION public.handle_sale_cancellation_to_movement()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- If status changed to 'cancelled'
    IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
        FOR item IN SELECT * FROM public.sale_items WHERE sale_id = NEW.id LOOP
            IF item.product_id IS NOT NULL THEN
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
                    NEW.company_id,
                    NEW.store_id,
                    item.product_id,
                    'RETURN',
                    item.quantity, -- Positive for returns
                    'SALE_CANCEL',
                    NEW.id,
                    auth.uid()
                );
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_sale_cancellation_to_inventory_movement
AFTER UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.handle_sale_cancellation_to_movement();

-- 9. Function for manual adjustments (used by the frontend)
CREATE OR REPLACE FUNCTION public.add_inventory_adjustment(
    p_product_id UUID,
    p_store_id UUID,
    p_quantity INTEGER,
    p_type TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
    
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
        p_type,
        p_quantity,
        'MANUAL_ADJUSTMENT',
        NULL,
        auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
