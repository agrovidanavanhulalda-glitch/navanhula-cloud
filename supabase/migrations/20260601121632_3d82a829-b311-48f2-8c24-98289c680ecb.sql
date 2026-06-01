-- Add soft delete columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Add index for performance on status and deleted_at
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);

-- Update existing products to active if status is null
UPDATE public.products SET status = 'active' WHERE status IS NULL;

-- Prevent physical deletes and redirect to soft delete if needed, 
-- or simply rely on the application logic and RLS.
-- Here we will add a policy to prevent physical deletion for non-admin users if we want,
-- but the prompt says "Nunca executar DELETE físico".
-- We can use a trigger to prevent physical DELETE.

CREATE OR REPLACE FUNCTION public.prevent_physical_delete_products()
RETURNS TRIGGER AS $$
BEGIN
    -- Perform soft delete instead of physical delete
    UPDATE public.products 
    SET status = 'deleted', 
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = OLD.id;
    
    -- Return NULL to cancel the physical delete
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to intercept physical DELETE and perform soft delete instead
DROP TRIGGER IF EXISTS tr_prevent_physical_delete_products ON public.products;
CREATE TRIGGER tr_prevent_physical_delete_products
BEFORE DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.prevent_physical_delete_products();

-- Update RLS policies to filter out deleted products by default if appropriate,
-- or ensure policies account for the status.
-- Most of our queries will add .neq('status', 'deleted') or .eq('status', 'active').
-- But we can also enforce it in RLS for standard roles.

-- Let's check existing policies first to be safe, but we can add a general one.
-- Actually, it's better to update the existing policies to include status check.

-- Re-grant permissions (standard procedure)
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
