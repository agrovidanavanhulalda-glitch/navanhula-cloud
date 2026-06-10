-- Função para sincronização forçada/imediata de perfis
CREATE OR REPLACE FUNCTION public.sync_user_profile(target_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
  v_full_name TEXT;
  v_company_id UUID;
  v_branch_id UUID;
  v_store_id UUID;
  v_role TEXT;
  v_raw_meta JSONB;
  v_result JSONB;
BEGIN
  -- 1. Obter dados do auth.users
  SELECT email, raw_user_meta_data INTO v_email, v_raw_meta 
  FROM auth.users 
  WHERE id = target_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in auth');
  END IF;

  -- 2. Extrair metadados
  v_full_name := COALESCE(v_raw_meta->>'full_name', split_part(v_email, '@', 1));
  v_company_id := (v_raw_meta->>'company_id')::UUID;
  v_branch_id := (v_raw_meta->>'branch_id')::UUID;
  v_store_id := (v_raw_meta->>'store_id')::UUID;
  v_role := COALESCE(v_raw_meta->>'role', 'seller');

  -- 3. Fallbacks para Company se não houver nos metadados
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id FROM public.company_users WHERE user_id = target_user_id LIMIT 1;
    IF v_company_id IS NULL THEN
       SELECT id INTO v_company_id FROM public.companies WHERE is_system_owner = true LIMIT 1;
    END IF;
  END IF;

  -- 4. Garantir registros nas tabelas de perfil
  
  -- Profile
  INSERT INTO public.profiles (id, email, full_name, company_id, branch_id, store_id, status, onboarding_completed)
  VALUES (target_user_id, v_email, v_full_name, v_company_id, v_branch_id, v_store_id, 'active', true)
  ON CONFLICT (id) DO UPDATE SET
    company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
    branch_id = COALESCE(public.profiles.branch_id, EXCLUDED.branch_id),
    store_id = COALESCE(public.profiles.store_id, EXCLUDED.store_id),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  -- User Roles
  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (target_user_id, v_role::public.app_role, v_company_id)
  ON CONFLICT (user_id) DO UPDATE SET 
    role = EXCLUDED.role,
    company_id = COALESCE(public.user_roles.company_id, EXCLUDED.company_id);

  -- Company Users
  INSERT INTO public.company_users (user_id, company_id, branch_id, role, status)
  VALUES (target_user_id, v_company_id, v_branch_id, v_role, 'active')
  ON CONFLICT (user_id, company_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active';

  -- Registrar log
  INSERT INTO public.bootstrap_logs (user_id, step, status, message)
  VALUES (target_user_id, 'manual_sync', 'completed', 'Perfil sincronizado manualmente com sucesso');

  RETURN jsonb_build_object(
    'success', true, 
    'user_id', target_user_id,
    'company_id', v_company_id,
    'role', v_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_profile TO service_role;