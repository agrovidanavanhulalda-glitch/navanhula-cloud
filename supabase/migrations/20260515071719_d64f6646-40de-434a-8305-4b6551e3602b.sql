CREATE OR REPLACE FUNCTION public.accept_invite_secure(p_token text)
RETURNS jsonb AS $$
DECLARE
    v_invite RECORD;
    v_user_id UUID;
    v_role_name TEXT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;

    -- Validate invite
    SELECT i.*, r.name as role_name INTO v_invite 
    FROM public.invites i
    JOIN public.roles r ON i.role_id = r.id
    WHERE i.token = p_token AND i.status = 'pending' AND i.expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired invite');
    END IF;

    -- 1. Update Profile
    UPDATE public.profiles
    SET company_id = v_invite.company_id,
        onboarding_completed = true,
        status = 'active'
    WHERE id = v_user_id;

    -- 2. Sync to company_users (EQUIPE)
    INSERT INTO public.company_users (
        user_id, 
        company_id, 
        role, 
        status
    )
    VALUES (
        v_user_id, 
        v_invite.company_id, 
        LOWER(v_invite.role_name),
        'active'
    )
    ON CONFLICT (user_id, company_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = 'active';

    -- 3. Set Role in user_roles
    BEGIN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, LOWER(v_invite.role_name)::app_role)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback if user_roles has different structure
    END;

    -- 4. Mark invite as accepted
    UPDATE public.invites
    SET status = 'accepted', updated_at = now()
    WHERE id = v_invite.id;

    RETURN jsonb_build_object('success', true, 'company_id', v_invite.company_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
