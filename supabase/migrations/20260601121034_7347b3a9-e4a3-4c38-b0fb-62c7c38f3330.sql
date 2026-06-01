
-- 1. Criar tabela de logs para auditoria de bootstrap
CREATE TABLE IF NOT EXISTS public.bootstrap_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT,
    step TEXT NOT NULL,
    status TEXT NOT NULL, -- 'SUCCESS', 'ERROR'
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT INSERT, SELECT ON public.bootstrap_logs TO authenticated;
GRANT ALL ON public.bootstrap_logs TO service_role;

-- 2. Refatorar bootstrap_current_user com transação atômica e logs
CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_email text;
  v_full_name text;
  v_company_id uuid;
  v_branch_id uuid;
  v_raw_meta jsonb;
  v_lock_key bigint;
BEGIN
  -- Verificar se usuário está autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Acesso não autorizado: Usuário não identificado.';
  END IF;

  -- Bloqueio consultivo baseado no ID do usuário para evitar race conditions
  -- Convert UUID to bigint for pg_advisory_xact_lock
  v_lock_key := ('x' || substr(md5(v_user_id::text), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Obter dados do Auth.Users
  SELECT email, raw_user_meta_data INTO v_email, v_raw_meta 
  FROM auth.users 
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    INSERT INTO public.bootstrap_logs (user_id, step, status, message)
    VALUES (v_user_id, 'AUTH_CHECK', 'ERROR', 'Registro auth.users não encontrado.');
    RAISE EXCEPTION 'Erro Crítico: Usuário não encontrado no sistema de autenticação.';
  END IF;

  v_full_name := v_raw_meta ->> 'full_name';
  IF v_full_name IS NULL OR v_full_name = '' THEN 
    v_full_name := split_part(v_email, '@', 1); 
  END IF;

  -- 1. Garantir Empresa (Company)
  -- Tentar encontrar empresa existente via profile ou company_users
  SELECT company_id INTO v_company_id FROM public.profiles WHERE id = v_user_id;
  
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM public.company_users WHERE user_id = v_user_id LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, is_active)
    VALUES (COALESCE(v_full_name, 'Empresa Principal'), true)
    RETURNING id INTO v_company_id;
    
    INSERT INTO public.bootstrap_logs (user_id, email, step, status, message, metadata)
    VALUES (v_user_id, v_email, 'COMPANY_CREATION', 'SUCCESS', 'Nova empresa criada.', jsonb_build_object('company_id', v_company_id));
  END IF;

  -- 2. Garantir Filial (Branch)
  SELECT id INTO v_branch_id FROM public.branches WHERE company_id = v_company_id ORDER BY created_at LIMIT 1;
  
  IF v_branch_id IS NULL THEN
    INSERT INTO public.branches (name, company_id, is_active)
    VALUES ('Sede Principal', v_company_id, true)
    RETURNING id INTO v_branch_id;
    
    INSERT INTO public.bootstrap_logs (user_id, email, step, status, message, metadata)
    VALUES (v_user_id, v_email, 'BRANCH_CREATION', 'SUCCESS', 'Filial inicial criada.', jsonb_build_object('branch_id', v_branch_id));
  END IF;

  -- 3. Sincronizar Perfil (Profile)
  INSERT INTO public.profiles (
    id, email, full_name, company_id, branch_id, store_id, is_active, onboarding_completed
  )
  VALUES (
    v_user_id, v_email, v_full_name, v_company_id, v_branch_id, v_branch_id, true, true
  )
  ON CONFLICT (id) DO UPDATE
    SET company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
        branch_id = COALESCE(public.profiles.branch_id, EXCLUDED.branch_id),
        store_id = COALESCE(public.profiles.store_id, EXCLUDED.store_id),
        onboarding_completed = true,
        updated_at = now();

  -- 4. Garantir Role Administrativa
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN
    INSERT INTO public.user_roles (user_id, role, company_id) 
    VALUES (v_user_id, 'admin', v_company_id);
    
    INSERT INTO public.bootstrap_logs (user_id, email, step, status, message, metadata)
    VALUES (v_user_id, v_email, 'ROLE_ASSIGNMENT', 'SUCCESS', 'Role admin atribuída.', jsonb_build_object('role', 'admin'));
  END IF;

  -- Log Final de Sucesso
  INSERT INTO public.bootstrap_logs (user_id, email, step, status, message)
  VALUES (v_user_id, v_email, 'BOOTSTRAP_COMPLETE', 'SUCCESS', 'Processo concluído com sucesso.');

EXCEPTION WHEN OTHERS THEN
  -- Log de Erro antes do Rollback (usando dblink ou raise notice não persistiria, então o log principal falha)
  -- Mas como estamos dentro de uma transação atômica, o RAISE garante o Rollback.
  INSERT INTO public.bootstrap_logs (user_id, email, step, status, message, metadata)
  VALUES (v_user_id, v_email, 'BOOTSTRAP_FATAL_ERROR', 'ERROR', SQLERRM, jsonb_build_object('sqlstate', SQLSTATE));
  
  RAISE EXCEPTION 'Falha Crítica no Bootstrap: %. O sistema realizou rollback automático.', SQLERRM;
END;
$function$
;
