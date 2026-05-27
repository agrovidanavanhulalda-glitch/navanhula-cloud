-- 1. Melhorar a unicidade de SKUs (Código do Produto)
-- Tornar o código único POR EMPRESA, permitindo que diferentes empresas usem o mesmo SKU.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_code_key;
ALTER TABLE public.products ADD CONSTRAINT products_company_code_key UNIQUE (company_id, code);

-- 2. Atualizar a função RPC para criação estável de produtos
CREATE OR REPLACE FUNCTION public.create_product_with_stock(
    p_name text,
    p_cost_price numeric,
    p_sale_price numeric,
    p_initial_stock integer,
    p_store_id uuid,
    p_company_id uuid,
    p_is_active boolean DEFAULT true,
    p_image_url text DEFAULT NULL,
    p_code text DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_description text DEFAULT NULL
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
    v_final_code text;
    v_user_id uuid := auth.uid();
BEGIN
    -- Validação de entrada
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nome do produto é obrigatório');
    END IF;

    IF p_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ID da empresa é obrigatório');
    END IF;

    -- Geração de SKU (Code)
    IF p_code IS NULL OR trim(p_code) = '' THEN
        v_final_code := public.generate_product_sku();
    ELSE
        v_final_code := trim(p_code);
    END IF;

    -- Verificar se a empresa existe
    SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_company_id) INTO v_company_exists;
    IF NOT v_company_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Empresa não encontrada ou ID inválido');
    END IF;

    -- Verificar unicidade do SKU na empresa (redundante por causa da constraint, mas bom para erro amigável)
    IF EXISTS(SELECT 1 FROM public.products WHERE company_id = p_company_id AND code = v_final_code) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Já existe um produto com este código (SKU) na sua empresa');
    END IF;

    -- Inserção do Produto
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
        created_by,
        created_at,
        updated_at
    ) VALUES (
        trim(p_name),
        v_final_code,
        COALESCE(p_cost_price, 0),
        COALESCE(p_sale_price, 0),
        p_company_id,
        p_category_id,
        p_description,
        p_image_url,
        COALESCE(p_is_active, true),
        v_user_id,
        now(),
        now()
    ) RETURNING id INTO v_product_id;

    -- Gestão de Inventário Inicial
    IF p_store_id IS NOT NULL THEN
        -- Verificar se a loja pertence à empresa
        SELECT EXISTS(
            SELECT 1 FROM public.stores WHERE id = p_store_id AND company_id = p_company_id
            UNION
            SELECT 1 FROM public.branches WHERE id = p_store_id AND company_id = p_company_id
        ) INTO v_branch_exists;

        IF v_branch_exists THEN
            -- Garantir registro na tabela de stock (inventory) mesmo que seja zero
            INSERT INTO public.product_stock (
                product_id, 
                store_id, 
                quantity, 
                company_id, 
                created_by
            )
            VALUES (
                v_product_id, 
                p_store_id, 
                0, -- Inicializa com zero
                p_company_id, 
                v_user_id
            )
            ON CONFLICT (product_id, store_id) DO NOTHING;

            -- Se houver stock inicial, gera movimento de ENTRADA
            IF p_initial_stock > 0 THEN
                INSERT INTO public.inventory_movements (
                    product_id,
                    branch_id,
                    company_id,
                    movement_type,
                    quantity,
                    reference_type,
                    notes,
                    created_by,
                    created_at
                ) VALUES (
                    v_product_id,
                    p_store_id,
                    p_company_id,
                    'ENTRY', -- Padronizado como ENTRY conforme solicitado
                    p_initial_stock,
                    'initial_load',
                    'Stock inicial na criação do produto (Enterprise)',
                    v_user_id,
                    now()
                );
            END IF;
        END IF;
    END IF;

    -- Log de Auditoria
    INSERT INTO public.audit_logs (
        company_id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_data
    ) VALUES (
        p_company_id,
        v_user_id,
        'CREATE',
        'product',
        v_product_id,
        jsonb_build_object(
            'name', p_name, 
            'sku', v_final_code, 
            'initial_stock', p_initial_stock,
            'store_id', p_store_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'id', v_product_id,
        'name', p_name,
        'code', v_final_code,
        'initial_stock', p_initial_stock,
        'message', 'Produto criado com sucesso no ecossistema NAVANHULA'
    );

EXCEPTION WHEN OTHERS THEN
    -- Rollback é automático em funções PL/pgSQL se não houver sub-blocos com exception
    -- Aqui retornamos o erro para o frontend tratar
    RETURN jsonb_build_object(
        'success', false, 
        'error', SQLERRM,
        'detail', SQLSTATE,
        'hint', 'Falha crítica na criação do produto. Verifique permissões e integridade de dados.'
    );
END;
$$;

-- 3. Melhorar o trigger de processamento de inventário
CREATE OR REPLACE FUNCTION public.process_inventory_movement()
RETURNS trigger AS $$
DECLARE
    v_current_qty INTEGER;
    v_product_name TEXT;
BEGIN
    -- Garantir company_id (herda do produto se for NULL no movimento)
    IF NEW.company_id IS NULL THEN
        SELECT company_id INTO NEW.company_id FROM public.products WHERE id = NEW.product_id;
    END IF;

    -- Validações críticas de integridade
    IF NEW.company_id IS NULL THEN
        RAISE EXCEPTION 'company_id é obrigatório para movimentos de inventário';
    END IF;

    IF NEW.branch_id IS NULL THEN
        RAISE EXCEPTION 'branch_id (loja) é obrigatório para movimentos de inventário';
    END IF;

    -- Garantir que existe registro de stock (UPSERT seguro)
    INSERT INTO public.product_stock (product_id, store_id, quantity, company_id, created_by)
    VALUES (NEW.product_id, NEW.branch_id, 0, NEW.company_id, NEW.created_by)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    -- Lock de linha para evitar race conditions em updates concorrentes
    SELECT quantity INTO v_current_qty
    FROM public.product_stock
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id
    FOR UPDATE;

    -- Ajustar quantidade com base no sinal ou tipo se necessário
    -- (Atualmente o sistema envia valores positivos para ENTRY/IN e negativos para SALE/OUT)
    
    -- Verificação de stock negativo (Bloqueia se for saída e não houver saldo suficiente)
    IF (COALESCE(v_current_qty, 0) + NEW.quantity) < 0 THEN
        SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
        RAISE EXCEPTION 'Stock insuficiente para "%". Disponível: %, Necessário: %', 
            COALESCE(v_product_name, 'Produto'), 
            COALESCE(v_current_qty, 0), 
            ABS(NEW.quantity);
    END IF;

    -- Atualização atômica do cache de stock
    UPDATE public.product_stock
    SET quantity = COALESCE(quantity, 0) + NEW.quantity,
        updated_at = now()
    WHERE product_id = NEW.product_id AND store_id = NEW.branch_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
