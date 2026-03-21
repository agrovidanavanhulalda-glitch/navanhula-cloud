
-- Add seller_name to sales table so it's persisted directly
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_name TEXT;

-- Make product_id nullable in sale_items to allow manual items
ALTER TABLE public.sale_items ALTER COLUMN product_id DROP NOT NULL;
