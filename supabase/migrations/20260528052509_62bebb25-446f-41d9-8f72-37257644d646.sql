-- Create a dedicated table for tracking the authentication and user creation flow
CREATE TABLE public.auth_flow_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id BIGINT DEFAULT txid_current(),
    user_id UUID,
    email TEXT,
    step TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failure', 'started'
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT ON public.auth_flow_logs TO authenticated;
GRANT ALL ON public.auth_flow_logs TO service_role;

-- Enable RLS
ALTER TABLE public.auth_flow_logs ENABLE ROW LEVEL SECURITY;

-- Only Super Admins or CEOs should see these logs (simplified for now to authenticated with check)
CREATE POLICY "Admins can view auth flow logs" 
ON public.auth_flow_logs 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'ceo', 'manager')
    )
);

-- Create a helper function to log auth events that can be used by triggers or RPCs
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_user_id UUID,
    p_email TEXT,
    p_step TEXT,
    p_status TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.auth_flow_logs (user_id, email, step, status, metadata, error_message)
    VALUES (p_user_id, p_email, p_step, p_status, p_metadata, p_error_message)
    RETURNING id INTO v_log_id;
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_auth_user function to include logging
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_company_id UUID;
    v_branch_id UUID;
    v_full_name TEXT;
    v_raw_role TEXT;
    v_mapped_role TEXT;
    v_store_id UUID;
    v_log_id UUID;
BEGIN
    -- Initial Log
    PERFORM public.log_auth_event(NEW.id, NEW.email, 'trigger_started', 'success', NEW.raw_user_meta_data);

    -- Extract metadata with safety
    v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seller');
    v_mapped_role := public.map_role_name(v_raw_role);
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    -- Handle company_id with fallback
    BEGIN
        v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_company_id := NULL;
    END;

    IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id FROM public.companies WHERE is_system_owner = true LIMIT 1;
        IF v_company_id IS NULL THEN
            SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
        END IF;
    END IF;

    -- Handle branch_id with safety
    BEGIN
        v_branch_id := (NEW.raw_user_meta_data->>'branch_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_branch_id := NULL;
    END;

    -- If branch_id is provided, try to find matching store_id
    IF v_branch_id IS NOT NULL THEN
        SELECT id INTO v_store_id FROM public.stores WHERE id = v_branch_id OR company_id = v_company_id LIMIT 1;
    ELSE
        SELECT id INTO v_store_id FROM public.stores WHERE company_id = v_company_id ORDER BY created_at LIMIT 1;
        v_branch_id := v_store_id;
    END IF;

    -- Create/Update Profile
    BEGIN
        INSERT INTO public.profiles (
            id, email, full_name, company_id, branch_id, store_id, status, onboarding_completed
        )
        VALUES (
            NEW.id, NEW.email, v_full_name, v_company_id, v_branch_id, v_store_id, 'active', true
        )
        ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            branch_id = COALESCE(EXCLUDED.branch_id, public.profiles.branch_id),
            store_id = COALESCE(EXCLUDED.store_id, public.profiles.store_id),
            full_name = EXCLUDED.full_name;
        
        PERFORM public.log_auth_event(NEW.id, NEW.email, 'profile_created', 'success', jsonb_build_object('profile_id', NEW.id));
    EXCEPTION WHEN OTHERS THEN
        PERFORM public.log_auth_event(NEW.id, NEW.email, 'profile_failed', 'failure', NULL, SQLERRM);
        RAISE;
    END;

    -- Create/Update Company User Link
    BEGIN
        INSERT INTO public.company_users (user_id, company_id, branch_id, role, status)
        VALUES (NEW.id, v_company_id, v_branch_id, v_mapped_role, 'active')
        ON CONFLICT (user_id, company_id) DO UPDATE SET
            role = EXCLUDED.role,
            branch_id = COALESCE(EXCLUDED.branch_id, public.company_users.branch_id),
            status = 'active';
            
        PERFORM public.log_auth_event(NEW.id, NEW.email, 'company_user_created', 'success', jsonb_build_object('company_id', v_company_id));
    EXCEPTION WHEN OTHERS THEN
        PERFORM public.log_auth_event(NEW.id, NEW.email, 'company_user_failed', 'failure', NULL, SQLERRM);
        RAISE;
    END;

    -- Ensure entry in user_roles
    BEGIN
        INSERT INTO public.user_roles (user_id, role, company_id)
        VALUES (NEW.id, v_mapped_role::public.app_role, v_company_id)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
        
        PERFORM public.log_auth_event(NEW.id, NEW.email, 'user_role_created', 'success', jsonb_build_object('role', v_mapped_role));
    EXCEPTION WHEN OTHERS THEN
        PERFORM public.log_auth_event(NEW.id, NEW.email, 'user_role_failed', 'failure', NULL, SQLERRM);
        -- We don't necessarily want to block the whole user creation for this if profile/company_user succeeded
        RAISE WARNING 'Failed to set user_role for %: %', NEW.id, SQLERRM;
    END;

    -- Final Success Log
    PERFORM public.log_auth_event(NEW.id, NEW.email, 'trigger_completed', 'success');

    RETURN NEW;
END;
$function$;
