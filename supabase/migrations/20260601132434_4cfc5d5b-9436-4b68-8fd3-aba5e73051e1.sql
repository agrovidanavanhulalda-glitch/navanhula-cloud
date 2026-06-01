-- Update products select policy to exclude deleted items by default
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" 
ON public.products 
FOR SELECT 
USING (
  company_id = current_company_id() 
  AND (status IS DISTINCT FROM 'deleted' OR status IS NULL)
);

-- Policy to allow viewing deleted products (e.g. for restoration)
CREATE POLICY "products_select_deleted" 
ON public.products 
FOR SELECT 
USING (
  company_id = current_company_id() 
  AND status = 'deleted'
  AND is_admin_or_manager()
);

-- Function to restore a soft-deleted product
CREATE OR REPLACE FUNCTION public.restore_product(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT is_admin_or_manager() THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    UPDATE public.products 
    SET status = 'active',
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = now()
    WHERE id = p_product_id 
    AND company_id = current_company_id();

    RETURN FOUND;
END;
$$;

-- Refine the prevent physical delete trigger to ensure it doesn't cause client-side errors
-- and that it correctly sets deleted_by
CREATE OR REPLACE FUNCTION public.prevent_physical_delete_products()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Perform soft delete instead of physical delete
    UPDATE public.products 
    SET status = 'deleted', 
        deleted_at = now(),
        deleted_by = auth.uid(),
        updated_at = now()
    WHERE id = OLD.id;
    
    -- We return NULL to prevent the actual DELETE, 
    -- but we've already done the UPDATE.
    RETURN NULL;
END;
$function$;

-- Ensure the trigger is properly named and attached
DROP TRIGGER IF EXISTS tr_prevent_physical_delete_products ON public.products;
CREATE TRIGGER tr_prevent_physical_delete_products
BEFORE DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.prevent_physical_delete_products();

-- Grant access to the new function
GRANT EXECUTE ON FUNCTION public.restore_product(UUID) TO authenticated;
