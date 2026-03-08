-- Update complete_onboarding to only create ONE store ("Loja Principal")
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_company_name text,
  p_company_nif text DEFAULT NULL,
  p_company_phone text DEFAULT NULL,
  p_company_address text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid;
    v_company_id uuid;
    v_store_id uuid;
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

    -- Create only ONE store: Loja Principal
    INSERT INTO public.stores (name, company_id, is_active)
    VALUES ('Loja Principal', v_company_id, true)
    RETURNING id INTO v_store_id;

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
        'message', 'Empresa criada com sucesso. Loja Principal pronta.'
    );
END;
$function$;

-- Platform admin function for CEO dashboard (global stats)
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_company_id uuid;
  v_company_name text;
BEGIN
  v_company_id := get_user_company(auth.uid());
  SELECT name INTO v_company_name FROM companies WHERE id = v_company_id;
  
  -- Only NAVANHULA GROUP LDA can see platform stats
  IF v_company_name IS NULL OR upper(trim(v_company_name)) NOT LIKE '%NAVANHULA%' THEN
    RETURN json_build_object('error', 'unauthorized', 'message', 'Acesso restrito à administração da plataforma');
  END IF;

  SELECT json_build_object(
    'total_companies', (SELECT count(*) FROM companies WHERE is_active = true),
    'total_stores', (SELECT count(*) FROM stores WHERE is_active = true),
    'total_users', (SELECT count(*) FROM profiles WHERE is_active = true),
    'total_sales_all', (SELECT COALESCE(count(*), 0) FROM sales WHERE status = 'completed'),
    'revenue_all_month', (SELECT COALESCE(sum(total), 0) FROM sales WHERE status = 'completed' AND created_at >= date_trunc('month', now())),
    'active_subscriptions', (SELECT count(*) FROM subscriptions WHERE status = 'active'),
    'trial_subscriptions', (SELECT count(*) FROM subscriptions WHERE trial_ends_at > now() AND status = 'active'),
    'platform_revenue_month', (SELECT COALESCE(sum(price_monthly), 0) FROM subscriptions WHERE status = 'active'),
    'total_products', (SELECT count(*) FROM products WHERE is_active = true),
    'sales_today', (SELECT COALESCE(count(*), 0) FROM sales WHERE status = 'completed' AND created_at::date = CURRENT_DATE)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;