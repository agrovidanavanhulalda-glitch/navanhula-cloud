-- Function to map display role names to database standard roles
CREATE OR REPLACE FUNCTION public.map_role_name(p_role TEXT)
RETURNS TEXT AS $$
BEGIN
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
        WHEN 'financeiro' THEN 'admin' -- Map finance to admin or similar if specific role not found
        WHEN 'accountant' THEN 'seller'
        WHEN 'cashier' THEN 'seller'
        WHEN 'caixa' THEN 'seller'
        ELSE 'seller' -- Default fallback
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improved trigger function for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_branch_id UUID;
    v_full_name TEXT;
    v_raw_role TEXT;
    v_mapped_role TEXT;
    v_store_id UUID;
BEGIN
    -- 1. Extract metadata with safety
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
        -- Try to find system owner company
        SELECT id INTO v_company_id FROM public.companies WHERE is_system_owner = true LIMIT 1;
        -- Fallback to first company if no system owner
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

    -- 2. Find a valid store for the company if needed
    SELECT id INTO v_store_id FROM public.stores 
    WHERE company_id = v_company_id 
    ORDER BY created_at LIMIT 1;

    -- 3. Create Profile (Atomic & Safe)
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        company_id, 
        branch_id,
        store_id, 
        status, 
        onboarding_completed
    )
    VALUES (
        NEW.id, 
        NEW.email, 
        v_full_name, 
        v_company_id, 
        v_branch_id,
        v_store_id,
        'active',
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        branch_id = EXCLUDED.branch_id,
        store_id = EXCLUDED.store_id,
        full_name = EXCLUDED.full_name;

    -- 4. Create Company User Link
    -- Ensure role is valid for the check constraint
    IF v_mapped_role NOT IN ('owner', 'admin', 'manager', 'seller', 'accountant') THEN
        -- Fallback if mapping missed something allowed by the constraint but not the enum
        v_mapped_role := 'seller';
    END IF;

    INSERT INTO public.company_users (
        user_id, 
        company_id, 
        branch_id,
        role, 
        status
    )
    VALUES (
        NEW.id, 
        v_company_id, 
        v_branch_id,
        v_mapped_role,
        'active'
    )
    ON CONFLICT (user_id, company_id) DO UPDATE SET
        role = EXCLUDED.role,
        branch_id = EXCLUDED.branch_id,
        status = 'active';

    -- 5. Ensure entry in user_roles (ENUM based)
    -- We wrap this in a sub-block to prevent total failure if enum cast fails
    BEGIN
        INSERT INTO public.user_roles (user_id, role, company_id)
        VALUES (NEW.id, v_mapped_role::public.app_role, v_company_id)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    EXCEPTION WHEN OTHERS THEN
        -- Log or ignore if specific role table fails
        RAISE WARNING 'Failed to set user_role for %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
