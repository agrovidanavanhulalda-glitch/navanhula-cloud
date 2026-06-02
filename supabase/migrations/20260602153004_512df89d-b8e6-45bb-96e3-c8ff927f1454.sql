-- 1. Remover a restrição de check obsoleta em user_roles que bloqueia novos cargos
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- 2. Atualizar a função de bootstrap para ser mais robusta e consistente com o trigger
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
BEGIN
  -- VALIDAR: auth.users (Existência do usuário)
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;

  -- PREVENIR: Race Conditions (Advisory Lock per user)
  v_lock_key := ('x' || substr(md5(v_user_id::text), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- BUSCAR: Dados do auth.users
  SELECT email, raw_user_meta_data INTO v_email, v_raw_meta 
  FROM auth.users 
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    INSERT INTO public.bootstrap_logs (user_id, step, status, message)
    VALUES (v_user_id, 'AUTH_VALIDATION', 'ERROR', 'Registro em auth.users não encontrado');
    RAISE EXCEPTION 'AUTH_USER_NOT_FOUND';
  END IF;

  -- TRATAR: Nome completo
  v_full_name := COALESCE(v_raw_meta ->> 'full_name', split_part(v_email, '@', 1), 'Usuário');

  -- ETAPA 1: VALIDAR/CRIAR company_id
  -- Prioridade 1: Perfil existente
  SELECT company_id, branch_id, store_id INTO v_company_id, v_branch_id, v_store_id 
  FROM public.profiles WHERE id = v_user_id;
  
  -- Prioridade 2: Tabela de vinculação (tentar ambas por segurança)
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM public.company_users WHERE user_id = v_user_id LIMIT 1;
  END IF;
  
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM public.user_company WHERE user_id = v_user_id LIMIT 1;
  END IF;

  -- Prioridade 3: Criar nova empresa se não houver nenhuma
  IF v_company_id IS NULL THEN
    BEGIN
      INSERT INTO public.companies (name, is_active, status)
      VALUES (v_full_name || ' Business', true, 'active')
      RETURNING id INTO v_company_id;
      
      INSERT INTO public.bootstrap_logs (user_id, company_id, step, status, message)
      VALUES (v_user_id, v_company_id, 'COMPANY_SETUP', 'SUCCESS', 'Nova empresa criada automaticamente');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.bootstrap_logs (user_id, step, status, message, error_code)
      VALUES (v_user_id, 'COMPANY_SETUP', 'ERROR', SQLERRM, SQLSTATE);
      RAISE;
    END;
  END IF;

  -- ETAPA 2: VALIDAR/CRIAR branch e store
  -- Sincronizar branch_id e store_id se estiverem vazios
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
      -- Se a loja existe, podemos usá-la como branch ou criar nova
      INSERT INTO public.branches (name, company_id, is_active)
      VALUES ('Matriz', v_company_id, true)
      RETURNING id INTO v_branch_id;
    END IF;
  END IF;

  -- ETAPA 3: VALIDAR/CRIAR profiles (Atômico)
  INSERT INTO public.profiles (
    id, email, full_name, company_id, branch_id, store_id, is_active, onboarding_completed, status
  )
  VALUES (
    v_user_id, v_email, v_full_name, v_company_id, v_branch_id, v_store_id, true, true, 'active'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
        branch_id = COALESCE(public.profiles.branch_id, EXCLUDED.branch_id),
        store_id = COALESCE(public.profiles.store_id, EXCLUDED.store_id),
        status = 'active',
        updated_at = now();

  -- ETAPA 4: VALIDAR/ATRIBUIR role
  SELECT role INTO v_existing_role FROM public.user_roles WHERE user_id = v_user_id LIMIT 1;
  
  IF v_existing_role IS NULL THEN
    -- Mapear role da metadata ou default admin
    v_mapped_role := public.map_role_name(COALESCE(v_raw_meta ->> 'role', 'admin'));
    
    INSERT INTO public.user_roles (user_id, role, company_id) 
    VALUES (v_user_id, v_mapped_role::public.app_role, v_company_id)
    ON CONFLICT (user_id) DO UPDATE SET 
      role = EXCLUDED.role,
      company_id = COALESCE(public.user_roles.company_id, EXCLUDED.company_id);
    
    INSERT INTO public.bootstrap_logs (user_id, company_id, step, status, message)
    VALUES (v_user_id, v_company_id, 'ROLE_ASSIGNMENT', 'SUCCESS', 'Role ' || v_mapped_role || ' atribuída');
  END IF;

  -- ETAPA 5: Garantir associação em company_users
  INSERT INTO public.company_users (user_id, company_id, branch_id, role, status)
  VALUES (v_user_id, v_company_id, v_branch_id, COALESCE(v_existing_role::text, v_mapped_role), 'active')
  ON CONFLICT (user_id, company_id) DO UPDATE SET
    status = 'active',
    updated_at = now();

  -- Log final de sucesso
  INSERT INTO public.bootstrap_logs (user_id, company_id, email, step, status, message)
  VALUES (v_user_id, v_company_id, v_email, 'BOOTSTRAP_COMPLETE', 'SUCCESS', 'Bootstrap finalizado com sucesso');

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.bootstrap_logs (user_id, step, status, message, error_code)
  VALUES (v_user_id, 'CRITICAL_FAILURE', 'ERROR', SQLERRM, SQLSTATE);
  RAISE EXCEPTION 'BOOTSTRAP_FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$function$;