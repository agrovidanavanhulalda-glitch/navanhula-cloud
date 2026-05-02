DROP FUNCTION IF EXISTS public.get_invitation_by_token(TEXT);
DROP FUNCTION IF EXISTS public.accept_company_invitation(TEXT);

-- Function to get invitation details by token securely
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    role_id UUID,
    email TEXT,
    status TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT i.id, i.company_id, i.role_id, i.email, i.status, i.expires_at
    FROM public.invites i
    WHERE i.token = p_token
    AND i.status = 'pending'
    AND i.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_company_invitation(p_token TEXT)
RETURNS JSON AS $$
DECLARE
    v_invite_id UUID;
    v_company_id UUID;
    v_role_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    -- 1. Validate invitation
    SELECT id, company_id, role_id INTO v_invite_id, v_company_id, v_role_id
    FROM public.invites
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

    IF v_invite_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Convite inválido ou expirado.');
    END IF;

    -- 2. Create link in user_company
    INSERT INTO public.user_company (user_id, company_id, role_id, status)
    VALUES (v_user_id, v_company_id, v_role_id, 'active')
    ON CONFLICT (user_id, company_id) DO UPDATE
    SET role_id = EXCLUDED.role_id, status = 'active';

    -- 3. Mark invite as accepted
    UPDATE public.invites
    SET status = 'accepted'
    WHERE id = v_invite_id;

    -- 4. Audit Log
    INSERT INTO public.audit_logs (user_id, company_id, action, entity_type, entity_id)
    VALUES (v_user_id, v_company_id, 'accept_invite', 'invite', v_invite_id);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
