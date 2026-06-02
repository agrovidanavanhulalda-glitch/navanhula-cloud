-- Revoke EXECUTE from public on all SECURITY DEFINER functions in the public schema
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
        WHERE n.nspname = 'public' 
          AND p.prosecdef = true
    LOOP 
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', func_record.proname, func_record.arg_types);
        -- Grant back to authenticated and service_role for application use
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', func_record.proname, func_record.arg_types);
    END LOOP; 
END $$;

-- Specifically secure functions that might need more granular control or are highly sensitive
-- get_dashboard_stats: Ensure only authenticated users can call it
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid, uuid) TO authenticated, service_role;

-- toggle_company_status: Only service_role or master admins (handled via trigger/logic inside if needed)
REVOKE EXECUTE ON FUNCTION public.toggle_company_status(uuid, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_company_status(uuid, boolean) TO service_role;

-- ensure search_path is also reinforced for these specific sensitive functions
ALTER FUNCTION public.get_dashboard_stats(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.toggle_company_status(uuid, boolean) SET search_path = public;
