-- DROP existing function to allow changing return type
DROP FUNCTION IF EXISTS public.set_active_store(uuid);

-- Create active_store table
CREATE TABLE IF NOT EXISTS public.active_store (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on active_store
ALTER TABLE public.active_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own active store preference" ON public.active_store;
CREATE POLICY "Users can manage their own active store preference"
ON public.active_store FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 1. Correct Store Logic
CREATE OR REPLACE FUNCTION public.ensure_active_store()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE company_id = NEW.company_id AND is_active = true AND id != NEW.id) THEN
        NEW.is_active := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ensure_active_store ON public.stores;
CREATE TRIGGER tr_ensure_active_store
BEFORE INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.ensure_active_store();

-- Robust set_active_store with JSONB return
CREATE OR REPLACE FUNCTION public.set_active_store(p_store_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM public.stores WHERE id = p_store_id;
    
    IF v_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Loja não encontrada');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (company_id = v_company_id OR is_super_admin = true)
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Acesso negado a esta loja');
    END IF;

    INSERT INTO public.active_store (user_id, store_id, updated_at)
    VALUES (auth.uid(), p_store_id, now())
    ON CONFLICT (user_id) DO UPDATE SET store_id = p_store_id, updated_at = now();
    
    UPDATE public.profiles SET store_id = p_store_id, updated_at = now()
    WHERE id = auth.uid();
    
    RETURN jsonb_build_object('success', true, 'store_id', p_store_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Enterprise Seller Creation (Admin API Bridge)
CREATE OR REPLACE FUNCTION public.create_enterprise_seller(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_store_id UUID,
    p_role TEXT DEFAULT 'vendedor'
)
RETURNS jsonb AS $$
DECLARE
    v_new_user_id UUID;
    v_company_id UUID;
    v_admin_id UUID := auth.uid();
BEGIN
    SELECT company_id INTO v_company_id FROM public.profiles WHERE id = v_admin_id;
    
    IF v_company_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Apenas administradores de empresas podem criar vendedores');
    END IF;

    SELECT id INTO v_new_user_id FROM auth.users WHERE email = p_email;
    IF v_new_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este email já está em uso');
    END IF;

    v_new_user_id := extensions.uuid_generate_v4();
    
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
        role, aud, confirmation_token
    )
    VALUES (
        v_new_user_id, '00000000-0000-0000-0000-000000000000', p_email,
        extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('full_name', p_full_name, 'company_id', v_company_id, 'store_id', p_store_id),
        now(), now(), 'authenticated', 'authenticated',
        extensions.encode(extensions.digest(extensions.gen_random_bytes(32), 'sha256'), 'hex')
    );

    INSERT INTO public.profiles (
        id, email, full_name, company_id, store_id, is_active, onboarding_completed, created_by
    ) VALUES (
        v_new_user_id, p_email, p_full_name, v_company_id, p_store_id, true, true, v_admin_id
    );

    INSERT INTO public.user_roles (user_id, role) VALUES (v_new_user_id, p_role);

    INSERT INTO public.company_users (user_id, company_id, role, status, branch_id)
    VALUES (v_new_user_id, v_company_id, p_role, 'active', p_store_id);

    RETURN jsonb_build_object('success', true, 'user_id', v_new_user_id, 'email', p_email, 'password', p_password);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;
