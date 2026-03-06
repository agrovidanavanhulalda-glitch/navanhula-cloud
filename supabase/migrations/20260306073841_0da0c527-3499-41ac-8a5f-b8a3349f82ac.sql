
-- Update complete_onboarding to also create an online store
CREATE OR REPLACE FUNCTION public.complete_onboarding(p_company_name text, p_company_nif text DEFAULT NULL::text, p_company_phone text DEFAULT NULL::text, p_company_address text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid;
    v_company_id uuid;
    v_store_id uuid;
    v_online_store_id uuid;
    v_existing_company uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    SELECT company_id INTO v_existing_company
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_existing_company IS NOT NULL THEN
        RAISE EXCEPTION 'User already has a company assigned';
    END IF;

    INSERT INTO public.companies (name, nif, phone, address)
    VALUES (p_company_name, p_company_nif, p_company_phone, p_company_address)
    RETURNING id INTO v_company_id;

    -- Create physical store
    INSERT INTO public.stores (name, company_id, is_active)
    VALUES ('Loja Principal', v_company_id, true)
    RETURNING id INTO v_store_id;

    -- Create online store automatically
    INSERT INTO public.stores (name, company_id, is_active)
    VALUES ('Loja Online', v_company_id, true)
    RETURNING id INTO v_online_store_id;

    UPDATE public.profiles
    SET company_id = v_company_id,
        store_id = v_store_id,
        onboarding_completed = true,
        is_active = true,
        updated_at = now()
    WHERE id = v_user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    PERFORM public.link_referral_company(v_user_id, v_company_id);

    RETURN json_build_object(
        'success', true,
        'company_id', v_company_id,
        'store_id', v_store_id,
        'online_store_id', v_online_store_id,
        'message', 'Empresa criada com sucesso. Loja física e online prontas.'
    );
END;
$function$;
