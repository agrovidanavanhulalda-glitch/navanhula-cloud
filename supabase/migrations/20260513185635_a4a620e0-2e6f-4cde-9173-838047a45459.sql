-- Create standard invites table if not exists
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id),
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'canceled')),
    invited_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Policies for invites
DROP POLICY IF EXISTS "Users can view invites from their company" ON public.invites;
CREATE POLICY "Users can view invites from their company"
    ON public.invites FOR SELECT
    USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) 
        OR EXISTS (SELECT 1 FROM public.companies WHERE id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND is_system_owner = true)
    );

DROP POLICY IF EXISTS "Admins can create invites" ON public.invites;
CREATE POLICY "Admins can create invites"
    ON public.invites FOR INSERT
    WITH CHECK (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
    );

DROP POLICY IF EXISTS "Admins can update invites" ON public.invites;
CREATE POLICY "Admins can update invites"
    ON public.invites FOR UPDATE
    USING (
        company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'ceo'))
    );

-- Helper function to get invite data securely (public access via token)
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token TEXT)
RETURNS TABLE (
    invite_id UUID,
    email TEXT,
    company_name TEXT,
    role_name TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.email,
        c.name as company_name,
        r.name as role_name,
        i.expires_at
    FROM public.invites i
    JOIN public.companies c ON i.company_id = c.id
    JOIN public.roles r ON i.role_id = r.id
    WHERE i.token = p_token 
    AND i.status = 'pending'
    AND i.expires_at > now();
END;
$$;

-- RPC to accept invite
CREATE OR REPLACE FUNCTION public.accept_invite_secure(p_token TEXT)
RETURNS JSONB SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_invite RECORD;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;

    -- Validate invite
    SELECT * INTO v_invite FROM public.invites 
    WHERE token = p_token AND status = 'pending' AND expires_at > now()
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

    -- 2. Set Role (using existing roles table lookup to match enum)
    INSERT INTO public.user_roles (user_id, role)
    SELECT v_user_id, LOWER(r.name)::app_role
    FROM public.roles r WHERE r.id = v_invite.role_id
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    -- 3. Mark invite as accepted
    UPDATE public.invites 
    SET status = 'accepted', updated_at = now()
    WHERE id = v_invite.id;

    RETURN jsonb_build_object('success', true, 'company_id', v_invite.company_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
