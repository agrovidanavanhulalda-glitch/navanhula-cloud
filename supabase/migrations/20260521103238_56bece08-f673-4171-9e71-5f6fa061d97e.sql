CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Performance indexes for WMS/ERP
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch_id ON public.inventory_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_id ON public.inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_company_is_active ON public.products(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_code_trgm ON public.products USING gin (code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_stock_company_id ON public.product_stock(company_id);
