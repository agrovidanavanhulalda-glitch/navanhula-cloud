ALTER TABLE public.company_users DROP CONSTRAINT IF EXISTS company_users_role_check;
ALTER TABLE public.company_users ADD CONSTRAINT company_users_role_check CHECK ((role = ANY (ARRAY['ceo'::text, 'admin'::text, 'manager'::text, 'seller'::text, 'cashier'::text])));

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
    v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seller');
    v_mapped_role := public.map_role_name(v_raw_role);
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

    BEGIN
        v_actor_id := (NEW.raw_user_meta_data->>'actor_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_actor_id := NULL;
    END;

    BEGIN
        v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_company_id := NULL;
    END;

    IF v_company_id IS NULL THEN
        SELECT company_id INTO v_company_id FROM public.profiles WHERE id = v_actor_id;
    END IF;

    IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id FROM public.companies WHERE is_system_owner = true LIMIT 1;
        IF v_company_id IS NULL THEN
            SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
        END IF;
    END IF;

    BEGIN
        v_branch_id := (NEW.raw_user_meta_data->>'branch_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_branch_id := NULL;
    END;

    IF v_branch_id IS NOT NULL THEN
        SELECT id INTO v_store_id
        FROM public.stores
        WHERE id = v_branch_id
        LIMIT 1;
    END IF;

    IF v_store_id IS NULL THEN
        SELECT id INTO v_store_id
        FROM public.stores
        WHERE company_id = v_company_id
        ORDER BY created_at
        LIMIT 1;
    END IF;

    IF v_branch_id IS NULL AND v_mapped_role IN ('seller', 'cashier') THEN
        v_branch_id := v_store_id;
    END IF;

    INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, company_id, branch_id, role_key, status, metadata)
    VALUES (v_transaction_id, 'user_creation_start', v_actor_id, NEW.id, v_company_id, v_branch_id, v_mapped_role, 'processing', NEW.raw_user_meta_data);

    BEGIN
        INSERT INTO public.profiles (
            id, email, full_name, company_id, branch_id, store_id, status, onboarding_completed
        )
        VALUES (
            NEW.id, NEW.email, v_full_name, v_company_id, v_branch_id, v_store_id, 'active', true
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            company_id = COALESCE(EXCLUDED.company_id, public.profiles.company_id),
            branch_id = COALESCE(EXCLUDED.branch_id, public.profiles.branch_id),
            store_id = COALESCE(EXCLUDED.store_id, public.profiles.store_id),
            full_name = EXCLUDED.full_name;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, role_key, status, error_message)
        VALUES (v_transaction_id, 'profile_creation_failed', v_actor_id, NEW.id, v_mapped_role, 'failure', SQLERRM);
        RAISE;
    END;

    BEGIN
        INSERT INTO public.company_users (user_id, company_id, branch_id, role, status)
        VALUES (NEW.id, v_company_id, v_branch_id, v_mapped_role, 'active')
        ON CONFLICT (user_id, company_id) DO UPDATE SET
            role = EXCLUDED.role,
            branch_id = COALESCE(EXCLUDED.branch_id, public.company_users.branch_id),
            status = 'active';
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, role_key, status, error_message)
        VALUES (v_transaction_id, 'company_user_creation_failed', v_actor_id, NEW.id, v_mapped_role, 'failure', SQLERRM);
        RAISE;
    END;

    BEGIN
        INSERT INTO public.user_roles (user_id, role, company_id)
        VALUES (NEW.id, v_mapped_role::public.app_role, v_company_id)
        ON CONFLICT (user_id, role) DO UPDATE SET
            company_id = COALESCE(EXCLUDED.company_id, public.user_roles.company_id);
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, role_key, status, error_message)
        VALUES (v_transaction_id, 'user_role_creation_failed', v_actor_id, NEW.id, v_mapped_role, 'warning', SQLERRM);
        RAISE WARNING 'Failed to set user_role for %: %', NEW.id, SQLERRM;
    END;

    INSERT INTO public.auth_event_logs (transaction_id, event_type, actor_id, target_user_id, company_id, branch_id, role_key, status)
    VALUES (v_transaction_id, 'user_creation_complete', v_actor_id, NEW.id, v_company_id, v_branch_id, v_mapped_role, 'success');

    RETURN NEW;
END;
$function$;