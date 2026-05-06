-- 1. Função Robusta para Decremento de Stock
CREATE OR REPLACE FUNCTION public.decrement_product_stock(
    p_product_id UUID,
    p_store_id UUID,
    p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Se não existir entrada de stock para este produto nesta loja, cria uma
    INSERT INTO public.product_stock (product_id, store_id, quantity)
    VALUES (p_product_id, p_store_id, 0)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    -- Atualiza a quantidade (pode ser negativo se p_quantity for positivo, ou positivo se p_quantity for negativo)
    UPDATE public.product_stock
    SET quantity = quantity - p_quantity,
        updated_at = now()
    WHERE product_id = p_product_id AND store_id = p_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger para Atualizar Stock em Itens de Venda
CREATE OR REPLACE FUNCTION public.handle_sale_item_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_store_id UUID;
BEGIN
    -- Buscar o store_id da venda pai
    SELECT store_id INTO v_store_id FROM public.sales WHERE id = NEW.sale_id;

    IF v_store_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
        PERFORM public.decrement_product_stock(NEW.product_id, v_store_id, NEW.quantity);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_stock_on_sale_item ON public.sale_items;
CREATE TRIGGER tr_update_stock_on_sale_item
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_sale_item_stock();

-- 3. Trigger para Restaurar Stock em Cancelamento de Venda
CREATE OR REPLACE FUNCTION public.handle_sale_cancellation_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
BEGIN
    -- Se o status mudou para 'cancelled'
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        FOR v_item IN SELECT product_id, quantity FROM public.sale_items WHERE sale_id = NEW.id LOOP
            IF v_item.product_id IS NOT NULL THEN
                PERFORM public.decrement_product_stock(v_item.product_id, NEW.store_id, -v_item.quantity);
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_restore_stock_on_cancel ON public.sales;
CREATE TRIGGER tr_restore_stock_on_cancel
AFTER UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.handle_sale_cancellation_stock();

-- 4. Garantir que CEO tenha acesso total (Ajuste RLS)
-- Assumindo que o cargo de CEO está na tabela user_roles ou user_company

DO $$
BEGIN
    -- Habilitar RLS em tabelas críticas se não estiverem
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
END $$;

-- Política para CEO ver tudo em products
DROP POLICY IF EXISTS "CEO can see all products" ON public.products;
CREATE POLICY "CEO can see all products" ON public.products
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND (ur.role = 'ceo' OR ur.role = 'admin')
    )
    OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Política para CEO ver tudo em sales
DROP POLICY IF EXISTS "CEO can see all sales" ON public.sales;
CREATE POLICY "CEO can see all sales" ON public.sales
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND (ur.role = 'ceo' OR ur.role = 'admin')
    )
    OR store_id IN (SELECT id FROM public.stores WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

-- 5. Garantir Empresa Default se necessário
-- (Esta parte garante que o sistema não falhe se a empresa não for encontrada)
INSERT INTO public.companies (id, name, company_type, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', 'NAVANHULA DEFAULT', 'master', true)
ON CONFLICT (id) DO NOTHING;
