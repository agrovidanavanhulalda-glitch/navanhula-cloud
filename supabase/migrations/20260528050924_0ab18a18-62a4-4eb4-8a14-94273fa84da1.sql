-- 1. Adicionar branch_id na tabela invites
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;

-- 2. Atualizar handle_new_auth_user para ser mais robusto com branch_id
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
BEGIN
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

    -- If branch_id is provided, try to find matching store_id (they are often synonymous in this app)
    IF v_branch_id IS NOT NULL THEN
        SELECT id INTO v_store_id FROM public.stores WHERE id = v_branch_id OR company_id = v_company_id LIMIT 1;
    ELSE
        SELECT id INTO v_store_id FROM public.stores WHERE company_id = v_company_id ORDER BY created_at LIMIT 1;
        v_branch_id := v_store_id; -- Sync them if not provided
    END IF;

    -- Create/Update Profile
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

    -- Create/Update Company User Link
    INSERT INTO public.company_users (user_id, company_id, branch_id, role, status)
    VALUES (NEW.id, v_company_id, v_branch_id, v_mapped_role, 'active')
    ON CONFLICT (user_id, company_id) DO UPDATE SET
        role = EXCLUDED.role,
        branch_id = COALESCE(EXCLUDED.branch_id, public.company_users.branch_id),
        status = 'active';

    -- Ensure entry in user_roles
    BEGIN
        INSERT INTO public.user_roles (user_id, role, company_id)
        VALUES (NEW.id, v_mapped_role::public.app_role, v_company_id)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to set user_role for %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$function$;

-- 3. Atualizar accept_invite_secure para suportar branch_id
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

    RETURN jsonb_build_object('success', true, 'company_id', v_company_id, 'branch_id', v_branch_id);
END;
$function$;

-- 4. Atualizar bootstrap_current_user para garantir branch_id
CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_full_name text;
  v_store_id uuid;
  v_company_id uuid;
  v_branch_id uuid;
  v_raw_meta jsonb;
BEGIN
  SELECT email, raw_user_meta_data INTO v_email, v_raw_meta FROM auth.users WHERE id = auth.uid();
  
  v_full_name := v_raw_meta ->> 'full_name';
  IF v_full_name IS NULL THEN v_full_name := split_part(v_email, '@', 1); END IF;

  -- 1. Get/Set Company
  SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid();
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1;
    IF v_company_id IS NULL THEN
      INSERT INTO public.companies (name, is_active)
      VALUES (COALESCE(v_full_name, 'Minha Empresa'), true)
      RETURNING id INTO v_company_id;
    END IF;
  END IF;

  -- 2. Get/Set Branch & Store
  SELECT branch_id INTO v_branch_id FROM public.profiles WHERE id = auth.uid();
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM public.branches WHERE company_id = v_company_id ORDER BY created_at LIMIT 1;
    IF v_branch_id IS NULL THEN
        -- Try stores if branches empty
        SELECT id INTO v_branch_id FROM public.stores WHERE company_id = v_company_id ORDER BY created_at LIMIT 1;
        IF v_branch_id IS NULL THEN
            INSERT INTO public.branches (name, company_id, is_active)
            VALUES ('Sede Principal', v_company_id, true)
            RETURNING id INTO v_branch_id;
        END IF;
    END IF;
  END IF;
  
  v_store_id := v_branch_id; -- Sync for legacy support

  -- 3. Sync profile
  INSERT INTO public.profiles (id, email, full_name, company_id, branch_id, store_id, is_active, onboarding_completed)
  VALUES (auth.uid(), v_email, v_full_name, v_company_id, v_branch_id, v_store_id, true, true)
  ON CONFLICT (id) DO UPDATE
    SET company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
        branch_id = COALESCE(public.profiles.branch_id, EXCLUDED.branch_id),
        store_id = COALESCE(public.profiles.store_id, EXCLUDED.store_id),
        onboarding_completed = true;

  -- 4. Ensure roles
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    INSERT INTO public.user_roles (user_id, role, company_id) VALUES (auth.uid(), 'admin', v_company_id);
  END IF;
END;
$function$;
