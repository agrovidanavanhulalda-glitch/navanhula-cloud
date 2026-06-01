-- Update the soft delete trigger to free up the SKU/code
CREATE OR REPLACE FUNCTION public.prevent_physical_delete_products()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Perform soft delete instead of physical delete
    -- We append a unique suffix to the code to allow the original code to be reused
    UPDATE public.products 
    SET status = 'deleted', 
        deleted_at = now(),
        deleted_by = auth.uid(),
        updated_at = now(),
        code = CASE 
                 WHEN code IS NOT NULL AND code NOT LIKE '%-deleted-%' 
                 THEN code || '-deleted-' || substr(id::text, 1, 8)
                 ELSE code 
               END
    WHERE id = OLD.id;
    
    RETURN NULL;
END;
$function$;

-- Update restore_product to handle the SKU suffix and check for conflicts
CREATE OR REPLACE FUNCTION public.restore_product(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_original_code TEXT;
    v_clean_code TEXT;
BEGIN
    IF NOT is_admin_or_manager() THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    -- Get the current code
    SELECT code INTO v_original_code 
    FROM public.products 
    WHERE id = p_product_id;

    -- Clean the code if it has the deleted suffix
    IF v_original_code LIKE '%-deleted-%' THEN
        v_clean_code := split_part(v_original_code, '-deleted-', 1);
        
        -- Check if the clean code is already taken by an active product
        IF EXISTS (
            SELECT 1 FROM public.products 
            WHERE company_id = current_company_id() 
            AND code = v_clean_code 
            AND (status IS DISTINCT FROM 'deleted' OR status IS NULL)
        ) THEN
            -- If taken, keep the deleted code or suggest a new one? 
            -- For now, let's keep it and let the user rename it if they want, 
            -- or we can just try to restore with a different suffix.
            v_clean_code := v_original_code; 
        END IF;
    ELSE
        v_clean_code := v_original_code;
    END IF;

    UPDATE public.products 
    SET status = 'active',
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = now(),
        code = v_clean_code
    WHERE id = p_product_id 
    AND company_id = current_company_id();

    RETURN FOUND;
END;
$$;
