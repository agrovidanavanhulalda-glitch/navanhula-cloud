-- 1. Reforçar obrigatoriedade de company_id em produtos
ALTER TABLE public.products ALTER COLUMN company_id SET NOT NULL;

-- 2. Garantir que quantity em product_stock nunca seja nulo
UPDATE public.product_stock SET quantity = 0 WHERE quantity IS NULL;
ALTER TABLE public.product_stock ALTER COLUMN quantity SET DEFAULT 0;
ALTER TABLE public.product_stock ALTER COLUMN quantity SET NOT NULL;

-- 3. Adicionar check constraints para valores numéricos negativos onde não faz sentido
ALTER TABLE public.products ADD CONSTRAINT products_sale_price_check CHECK (sale_price >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_cost_price_check CHECK (cost_price >= 0);

-- 4. Melhorar o tratamento de branch_id em inventory_movements
-- Garantir que branch_id referencie ou a tabela stores ou branches (sistema legado/híbrido)
-- (Já existem FKs provavelmente, mas vamos garantir que não seja nulo)
ALTER TABLE public.inventory_movements ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.inventory_movements ALTER COLUMN company_id SET NOT NULL;

-- 5. Adicionar índices para performance em auditoria e relatórios
CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch_id ON public.inventory_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_id ON public.inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_company_id ON public.product_stock(company_id);
