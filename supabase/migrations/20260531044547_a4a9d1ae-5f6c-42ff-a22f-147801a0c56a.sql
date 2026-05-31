-- Update accept_invite_secure to include detailed auditing
CREATE OR REPLACE FUNCTION public.accept_invite_secure(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_invite RECORD;
    v_user_id UUID;
    v_role_key TEXT;
    v_company_id UUID;
    v_branch_id UUID;
    v_transaction_id UUID := gen_random_uuid();
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;

    -- Validate invite
    SELECT i.*, r.key as role_key INTO v_invite 
    FROM public.invites i
    JOIN public.roles r ON i.role_id = r.id
    WHERE i.token = p_token AND i.status = 'pending' AND (i.expires_at IS NULL OR i.expires_at > now())
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Audit failure
        INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, status, error_message, role_key)
        VALUES (v_transaction_id, 'invite_accept_attempt', v_user_id, v_user_id, 'failure', 'Invalid or expired invite', 'unknown');
        
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired invite');
    END IF;

    v_role_key := v_invite.role_key;
    v_company_id := v_invite.company_id;
    v_branch_id := v_invite.branch_id;

    -- If branch_id is null, find first store/branch
    IF v_branch_id IS NULL THEN
        SELECT id INTO v_branch_id FROM public.branches WHERE company_id = v_company_id ORDER BY created_at LIMIT 1;
    END IF;

    -- 1. Update Profile
    UPDATE public.profiles
    SET company_id = v_company_id,
        branch_id = v_branch_id,
        store_id = v_branch_id, -- Keep in sync
        onboarding_completed = true,
        status = 'active'
    WHERE id = v_user_id;

    -- 2. Sync to company_users
    INSERT INTO public.company_users (user_id, company_id, branch_id, role, status)
    VALUES (v_user_id, v_company_id, v_branch_id, v_role_key, 'active')
    ON CONFLICT (user_id, company_id) DO UPDATE SET
        role = EXCLUDED.role,
        branch_id = EXCLUDED.branch_id,
        status = 'active';

    -- 3. Set Role in user_roles
    BEGIN
        INSERT INTO public.user_roles (user_id, role, company_id)
        VALUES (v_user_id, v_role_key::public.app_role, v_company_id)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 4. Mark invite as accepted
    UPDATE public.invites
    SET status = 'accepted', updated_at = now()
    WHERE id = v_invite.id;

    -- Audit Success
    INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, company_id, branch_id, role_key, status)
    VALUES (v_transaction_id, 'invite_accept_success', v_user_id, v_user_id, v_company_id, v_branch_id, v_role_key, 'success');

    RETURN jsonb_build_object('success', true, 'company_id', v_company_id, 'branch_id', v_branch_id, 'transaction_id', v_transaction_id);
END;
$function$;

-- Update handle_new_auth_user trigger to include detailed auditing
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
    v_transaction_id UUID := gen_random_uuid();
    v_actor_id UUID;
BEGIN
    -- Extract metadata with safety
    v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seller');
    v_mapped_role := public.map_role_name(v_raw_role);
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    -- Try to identify the actor (the admin who created the user, if applicable)
    -- In Supabase admin.createUser calls, the current user context might not be available
    -- but we can pass it in metadata if needed. For now, null or from metadata.
    BEGIN
        v_actor_id := (NEW.raw_user_meta_data->>'actor_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_actor_id := NULL;
    END;

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

    -- Audit Creation Start
    INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, company_id, branch_id, role_key, status, metadata)
    VALUES (v_transaction_id, 'user_creation_start', v_actor_id, NEW.id, v_company_id, v_branch_id, v_mapped_role, 'processing', NEW.raw_user_meta_data);

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
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, status, error_message)
        VALUES (v_transaction_id, 'profile_creation_failed', v_actor_id, NEW.id, 'failure', SQLERRM);
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
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, status, error_message)
        VALUES (v_transaction_id, 'company_user_creation_failed', v_actor_id, NEW.id, 'failure', SQLERRM);
        RAISE;
    END;

    -- Ensure entry in user_roles
    BEGIN
        INSERT INTO public.user_roles (user_id, role, company_id)
        VALUES (NEW.id, v_mapped_role::public.app_role, v_company_id)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, status, error_message)
        VALUES (v_transaction_id, 'user_role_creation_failed', v_actor_id, NEW.id, 'warning', SQLERRM);
        RAISE WARNING 'Failed to set user_role for %: %', NEW.id, SQLERRM;
    END;

    -- Final Success Audit
    INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, company_id, branch_id, role_key, status)
    VALUES (v_transaction_id, 'user_creation_complete', v_actor_id, NEW.id, v_company_id, v_branch_id, v_mapped_role, 'success');

    RETURN NEW;
END;
$function$;
