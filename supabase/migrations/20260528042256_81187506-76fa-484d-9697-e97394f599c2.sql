-- Add key column to roles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'key') THEN
        ALTER TABLE public.roles ADD COLUMN key TEXT;
    END IF;
END $$;

-- Update existing roles with keys
UPDATE public.roles SET key = 'ceo' WHERE name = 'CEO';
UPDATE public.roles SET key = 'admin' WHERE name = 'Admin';
UPDATE public.roles SET key = 'manager' WHERE name = 'Gerente';
UPDATE public.roles SET key = 'seller' WHERE name = 'Vendedor';
UPDATE public.roles SET key = 'admin' WHERE name = 'Financeiro' AND key IS NULL;
UPDATE public.roles SET key = LOWER(name) WHERE key IS NULL;

-- Update mapping function to be even more robust
CREATE OR REPLACE FUNCTION public.map_role_name(p_role TEXT)
RETURNS TEXT AS $$
DECLARE
    v_key TEXT;
BEGIN
    -- Try to find by name in roles table first
    SELECT key INTO v_key FROM public.roles WHERE LOWER(name) = LOWER(p_role) OR LOWER(key) = LOWER(p_role) LIMIT 1;
    
    IF v_key IS NOT NULL THEN
        RETURN v_key;
    END IF;

    -- Fallback manual mapping
    RETURN CASE LOWER(p_role)
        WHEN 'ceo' THEN 'ceo'
        WHEN 'owner' THEN 'ceo'
        WHEN 'admin' THEN 'admin'
        WHEN 'administrator' THEN 'admin'
        WHEN 'administrador' THEN 'admin'
        WHEN 'manager' THEN 'manager'
        WHEN 'gerente' THEN 'manager'
        WHEN 'seller' THEN 'seller'
        WHEN 'vendedor' THEN 'seller'
        WHEN 'financeiro' THEN 'admin'
        WHEN 'accountant' THEN 'seller'
        WHEN 'cashier' THEN 'seller'
        WHEN 'caixa' THEN 'seller'
        ELSE 'seller'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update accept_invite_secure to use map_role_name
CREATE OR REPLACE FUNCTION public.accept_invite_secure(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_invite RECORD;
    v_user_id UUID;
    v_role_key TEXT;
    v_company_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;

    -- Validate invite
    SELECT i.*, r.name as role_name, r.key as role_key INTO v_invite 
    FROM public.invites i
    JOIN public.roles r ON i.role_id = r.id
    WHERE i.token = p_token AND i.status = 'pending' AND (i.expires_at IS NULL OR i.expires_at > now())
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired invite');
    END IF;

    v_role_key := COALESCE(v_invite.role_key, public.map_role_name(v_invite.role_name));
    v_company_id := v_invite.company_id;

    -- 1. Update Profile
    UPDATE public.profiles
    SET company_id = v_company_id,
        onboarding_completed = true,
        status = 'active'
    WHERE id = v_user_id;

    -- 2. Sync to company_users
    INSERT INTO public.company_users (
        user_id, 
        company_id, 
        role, 
        status
    )
    VALUES (
        v_user_id, 
        v_company_id, 
        v_role_key,
        'active'
    )
    ON CONFLICT (user_id, company_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = 'active';

    -- 3. Set Role in user_roles (ENUM)
    BEGIN
        INSERT INTO public.user_roles (user_id, role, company_id)
        VALUES (v_user_id, v_role_key::public.app_role, v_company_id)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to sync user_roles in accept_invite_secure: %', SQLERRM;
    END;

    -- 4. Mark invite as accepted
    UPDATE public.invites
    SET status = 'accepted', updated_at = now()
    WHERE id = v_invite.id;

    RETURN jsonb_build_object('success', true, 'company_id', v_company_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;
