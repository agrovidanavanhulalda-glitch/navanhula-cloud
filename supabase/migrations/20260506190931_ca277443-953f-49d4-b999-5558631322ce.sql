-- 1. Garantir que a função decrement_product_stock seja robusta
CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id uuid, p_store_id uuid, p_quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Se não existir entrada de stock para este produto nesta loja, cria uma com 0
    INSERT INTO public.product_stock (product_id, store_id, quantity)
    VALUES (p_product_id, p_store_id, 0)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    -- Atualiza a quantidade (deduz se p_quantity for positivo)
    UPDATE public.product_stock
    SET quantity = quantity - p_quantity,
        updated_at = now()
    WHERE product_id = p_product_id AND store_id = p_store_id;
END;
$function$;

-- 2. Criar função para o Trigger de Vendas
CREATE OR REPLACE FUNCTION public.handle_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_store_id UUID;
BEGIN
    -- Buscar o store_id na tabela de vendas
    SELECT store_id INTO v_store_id FROM public.sales WHERE id = NEW.sale_id;
    
    -- Apenas processar se tivermos store_id e product_id (itens manuais não têm product_id)
    IF v_store_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
        -- Chamar decrement_product_stock (quantidade positiva para deduzir)
        PERFORM public.decrement_product_stock(NEW.product_id, v_store_id, NEW.quantity);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar o Trigger na tabela sale_items
DROP TRIGGER IF EXISTS update_stock_on_sale_trigger ON public.sale_items;
CREATE TRIGGER update_stock_on_sale_trigger
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_stock_on_sale();

-- 4. Criar entradas de stock em falta para produtos existentes
-- Isto evita que produtos com stock não definido desapareçam devido a joins restritivos
INSERT INTO public.product_stock (product_id, store_id, quantity)
SELECT p.id, s.id, 0
FROM public.products p
CROSS JOIN public.stores s
LEFT JOIN public.product_stock ps ON ps.product_id = p.id AND ps.store_id = s.id
WHERE ps.id IS NULL
ON CONFLICT (product_id, store_id) DO NOTHING;
