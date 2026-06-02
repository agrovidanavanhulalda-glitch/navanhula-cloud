CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_full_name TEXT;
  v_company_id UUID;
  v_branch_id UUID;
  v_store_id UUID;
  v_raw_meta JSONB;
  v_lock_key BIGINT;
  v_existing_role public.app_role;
  v_mapped_role TEXT;
  v_is_new_company BOOLEAN := FALSE;
BEGIN
  -- VALIDAR: auth.users
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;

  -- PREVENIR: Race Conditions
  v_lock_key := ('x' || substr(md5(v_user_id::text), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- BUSCAR: Dados do auth.users
  SELECT email, raw_user_meta_data INTO v_email, v_raw_meta 
  FROM auth.users 
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'AUTH_USER_NOT_FOUND';
  END IF;

  v_full_name := COALESCE(v_raw_meta ->> 'full_name', split_part(v_email, '@', 1), 'Usuário');

  -- ETAPA 1: VALIDAR/CRIAR company_id
  SELECT company_id, branch_id, store_id INTO v_company_id, v_branch_id, v_store_id 
  FROM public.profiles WHERE id = v_user_id;
  
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM public.company_users WHERE user_id = v_user_id LIMIT 1;
  END IF;
  
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM public.user_company WHERE user_id = v_user_id LIMIT 1;
  END IF;

  -- Criar nova empresa se não houver nenhuma associação
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, is_active, status)
    VALUES (v_full_name || ' Business', true, 'active')
    RETURNING id INTO v_company_id;
    v_is_new_company := TRUE;
  END IF;

  -- ETAPA 2: VALIDAR/CRIAR branch e store
  IF v_store_id IS NULL THEN
    SELECT id INTO v_store_id FROM public.stores WHERE company_id = v_company_id ORDER BY created_at LIMIT 1;
    IF v_store_id IS NULL THEN
      INSERT INTO public.stores (name, company_id, is_active)
      VALUES ('Loja Principal', v_company_id, true)
      RETURNING id INTO v_store_id;
    END IF;
  END IF;

  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM public.branches WHERE company_id = v_company_id ORDER BY created_at LIMIT 1;
    IF v_branch_id IS NULL THEN
      INSERT INTO public.branches (name, company_id, is_active)
      VALUES ('Matriz', v_company_id, true)
      RETURNING id INTO v_branch_id;
    END IF;
  END IF;

  -- ETAPA 3: Profiles
  INSERT INTO public.profiles (
    id, email, full_name, company_id, branch_id, store_id, is_active, onboarding_completed, status
  )
  VALUES (
    v_user_id, v_email, v_full_name, v_company_id, v_branch_id, v_store_id, true, true, 'active'
  )
  ON CONFLICT (id) DO UPDATE
    SET company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
        branch_id = COALESCE(public.profiles.branch_id, EXCLUDED.branch_id),
        store_id = COALESCE(public.profiles.store_id, EXCLUDED.store_id),
        updated_at = now();

  -- ETAPA 4: Atribuir role
  SELECT role INTO v_existing_role FROM public.user_roles WHERE user_id = v_user_id LIMIT 1;
  
  IF v_existing_role IS NULL THEN
    -- Se criou a empresa, é CEO. Senão, mapeia da metadata ou default seller.
    IF v_is_new_company THEN
      v_mapped_role := 'ceo';
    ELSE
      v_mapped_role := public.map_role_name(COALESCE(v_raw_meta ->> 'role', 'seller'));
    END IF;
    
    INSERT INTO public.user_roles (user_id, role, company_id) 
    VALUES (v_user_id, v_mapped_role::public.app_role, v_company_id)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    
    v_existing_role := v_mapped_role::public.app_role;
  END IF;

  -- ETAPA 5: Company Users
  INSERT INTO public.company_users (user_id, company_id, branch_id, role, status)
  VALUES (v_user_id, v_company_id, v_branch_id, v_existing_role::text, 'active')
  ON CONFLICT (user_id, company_id) DO UPDATE SET status = 'active';

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bootstrap_logs (user_id, step, status, message, error_code)
  VALUES (v_user_id, 'CRITICAL_FAILURE', 'ERROR', SQLERRM, SQLSTATE);
  RAISE EXCEPTION 'BOOTSTRAP_FAILED: %', SQLERRM;
END;
$function$;