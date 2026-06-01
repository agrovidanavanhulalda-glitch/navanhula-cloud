-- SPRINT 1 - ETAPA 2: AUDITORIA E CORREÇÃO BOOTSTRAP

-- 1. Garantir que a tabela de logs suporte todas as informações necessárias
CREATE TABLE IF NOT EXISTS public.bootstrap_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    company_id UUID,
    email TEXT,
    step TEXT NOT NULL,
    status TEXT NOT NULL, -- 'SUCCESS', 'ERROR', 'WARNING'
    message TEXT,
    error_code TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS nos logs apenas por segurança, mas permitir insert via service_role/security definer
ALTER TABLE public.bootstrap_logs ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.bootstrap_logs TO authenticated, anon, service_role;

-- 2. Função de Bootstrap Robusta e Atômica
CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_full_name TEXT;
  v_company_id UUID;
  v_branch_id UUID;
  v_raw_meta JSONB;
  v_lock_key BIGINT;
  v_existing_role public.app_role;
BEGIN
  -- VALIDAR: auth.users (Existência do usuário)
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_AUTHENTICATED';
  END IF;

  -- PREVENIR: Race Conditions (Advisory Lock per user)
  -- Gera uma chave numérica estável a partir do UUID
  v_lock_key := ('x' || substr(md5(v_user_id::text), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- BUSCAR: Dados do auth.users com tratamento de NULL
  SELECT email, raw_user_meta_data INTO v_email, v_raw_meta 
  FROM auth.users 
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    INSERT INTO public.bootstrap_logs (user_id, step, status, message)
    VALUES (v_user_id, 'AUTH_VALIDATION', 'ERROR', 'Registro em auth.users não encontrado');
    RAISE EXCEPTION 'AUTH_USER_NOT_FOUND';
  END IF;

  -- TRATAR: Null values no full_name (Causa comum de TypeError no frontend)
  v_full_name := COALESCE(v_raw_meta ->> 'full_name', split_part(v_email, '@', 1), 'Usuário');

  -- ETAPA 1: VALIDAR/CRIAR company_id
  -- Prioridade 1: Já tem perfil?
  SELECT company_id INTO v_company_id FROM public.profiles WHERE id = v_user_id;
  
  -- Prioridade 2: Já está em alguma empresa? (Convite/Membro)
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM public.user_company WHERE user_id = v_user_id LIMIT 1;
  END IF;

  -- Prioridade 3: Criar nova empresa (Se for o primeiro acesso)
  IF v_company_id IS NULL THEN
    BEGIN
      INSERT INTO public.companies (name, is_active)
      VALUES (v_full_name || ' Business', true)
      RETURNING id INTO v_company_id;
      
      INSERT INTO public.bootstrap_logs (user_id, company_id, step, status, message)
      VALUES (v_user_id, v_company_id, 'COMPANY_SETUP', 'SUCCESS', 'Nova empresa criada automaticamente');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.bootstrap_logs (user_id, step, status, message, error_code)
      VALUES (v_user_id, 'COMPANY_SETUP', 'ERROR', SQLERRM, SQLSTATE);
      RAISE;
    END;
  END IF;

  -- ETAPA 2: VALIDAR/CRIAR branch_id
  SELECT id INTO v_branch_id FROM public.branches WHERE company_id = v_company_id ORDER BY created_at LIMIT 1;
  
  IF v_branch_id IS NULL THEN
    INSERT INTO public.branches (name, company_id, is_active)
    VALUES ('Matriz', v_company_id, true)
    RETURNING id INTO v_branch_id;
  END IF;

  -- ETAPA 3: VALIDAR/CRIAR profiles (Atômico)
  INSERT INTO public.profiles (
    id, email, full_name, company_id, branch_id, is_active, onboarding_completed
  )
  VALUES (
    v_user_id, v_email, v_full_name, v_company_id, v_branch_id, true, true
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
        branch_id = COALESCE(public.profiles.branch_id, EXCLUDED.branch_id),
        updated_at = now();

  -- ETAPA 4: VALIDAR/ATRIBUIR role
  -- Verifica se o usuário já tem role (pode ter sido convidado)
  SELECT role INTO v_existing_role FROM public.user_roles WHERE user_id = v_user_id LIMIT 1;
  
  IF v_existing_role IS NULL THEN
    -- Primeiro usuário da empresa costuma ser CEO/Admin
    -- Se acabamos de criar a empresa, definimos como admin
    INSERT INTO public.user_roles (user_id, role, company_id) 
    VALUES (v_user_id, 'admin', v_company_id);
    
    INSERT INTO public.bootstrap_logs (user_id, company_id, step, status, message)
    VALUES (v_user_id, v_company_id, 'ROLE_ASSIGNMENT', 'SUCCESS', 'Role admin atribuída (proprietário)');
  END IF;

  -- Log final de sucesso
  INSERT INTO public.bootstrap_logs (user_id, company_id, email, step, status, message)
  VALUES (v_user_id, v_company_id, v_email, 'BOOTSTRAP_COMPLETE', 'SUCCESS', 'Bootstrap finalizado com sucesso');

EXCEPTION WHEN OTHERS THEN
  -- O Postgres garante o ROLLBACK automático por estarmos em uma função PL/pgSQL
  -- Mas o erro deve ser propagado para o frontend tratar
  RAISE EXCEPTION 'BOOTSTRAP_FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$function$;
