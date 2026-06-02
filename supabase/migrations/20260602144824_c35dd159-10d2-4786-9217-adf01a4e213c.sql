-- Fix Function Search Path Mutable for CUSTOM functions in public schema
-- We exclude functions owned by extensions (like pg_trgm) which we cannot ALTER
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN 
    FOR func_record IN 
        SELECT 
            p.proname, 
            n.nspname, 
            oidvectortypes(p.proargtypes) as arg_types
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
        WHERE n.nspname = 'public'
          AND d.objid IS NULL -- Not owned by an extension
    LOOP 
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', func_record.proname, func_record.arg_types);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not alter function %: %', func_record.proname, SQLERRM;
        END;
    END LOOP; 
END $$;

-- Specifically secure security definer functions with their exact signatures
-- We use a block to handle possible variations in parameter names/defaults
DO $$
BEGIN
    ALTER FUNCTION public.fn_log_product_changes() SET search_path = public;
    ALTER FUNCTION public.get_dashboard_stats(uuid, uuid) SET search_path = public;
    ALTER FUNCTION public.has_minimum_role(uuid, public.app_role) SET search_path = public;
    ALTER FUNCTION public.is_master_owner(uuid) SET search_path = public;
    ALTER FUNCTION public.get_user_role(uuid) SET search_path = public;
    ALTER FUNCTION public.get_user_company(uuid) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error setting search_path on specific functions: %', SQLERRM;
END $$;

-- Add missing RLS policies for tables that have RLS enabled but no policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'Service role can do everything on bootstrap_logs'
    ) THEN
        CREATE POLICY "Service role can do everything on bootstrap_logs" 
        ON public.bootstrap_logs FOR ALL TO service_role USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE polname = 'Users can view lead notes from their company'
    ) THEN
        CREATE POLICY "Users can view lead notes from their company" 
        ON public.lead_notes FOR SELECT 
        USING (company_id = (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

        CREATE POLICY "Users can insert lead notes for their company" 
        ON public.lead_notes FOR INSERT 
        WITH CHECK (company_id = (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

        CREATE POLICY "Users can update their own lead notes" 
        ON public.lead_notes FOR UPDATE 
        USING (created_by = auth.uid());

        CREATE POLICY "Users can delete their own lead notes" 
        ON public.lead_notes FOR DELETE 
        USING (created_by = auth.uid());
    END IF;
END $$;

GRANT ALL ON public.bootstrap_logs TO service_role;
GRANT ALL ON public.lead_notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
