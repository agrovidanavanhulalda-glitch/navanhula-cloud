-- Ensure audit_logs has the required columns
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS store_id UUID,
ADD COLUMN IF NOT EXISTS query_text TEXT;

-- Trigger function for automated auditing
CREATE OR REPLACE FUNCTION public.audit_resource_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_store_id UUID;
BEGIN
    -- Try to get current user and company context
    v_user_id := auth.uid();
    
    -- Extract company_id and store_id from the record if available
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        BEGIN
            v_company_id := NEW.company_id;
        EXCEPTION WHEN OTHERS THEN
            v_company_id := NULL;
        END;
        
        BEGIN
            v_store_id := NEW.id; -- If it's the stores table
            IF TG_TABLE_NAME <> 'stores' THEN
                v_store_id := NEW.store_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_store_id := NULL;
        END;
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        company_id,
        store_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        entity_type
    ) VALUES (
        v_user_id,
        v_company_id,
        v_store_id,
        TG_OP,
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
        TG_TABLE_NAME
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to stores and products
DROP TRIGGER IF EXISTS audit_stores_trigger ON public.stores;
CREATE TRIGGER audit_stores_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.audit_resource_change();

DROP TRIGGER IF EXISTS audit_products_trigger ON public.products;
CREATE TRIGGER audit_products_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_resource_change();

-- RLS Policies for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs of their own company"
ON public.audit_logs
FOR SELECT
USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
