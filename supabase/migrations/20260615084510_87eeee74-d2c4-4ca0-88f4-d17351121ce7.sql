CREATE OR REPLACE FUNCTION public.sync_user_profile(target_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_email TEXT;
  v_full_name TEXT;
  v_company_id UUID;
  v_branch_id UUID;
  v_store_id UUID;
  v_valid_branch_id UUID;
  v_role TEXT;
  v_mapped_role TEXT;
  v_raw_meta JSONB;
BEGIN
  SELECT email, raw_user_meta_data INTO v_email, v_raw_meta
  FROM auth.users
  WHERE id = target_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in auth');
  END IF;

  v_full_name := COALESCE(v_raw_meta->>'full_name', split_part(v_email, '@', 1));

  BEGIN
    v_company_id := (v_raw_meta->>'company_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_company_id := NULL;
  END;

  BEGIN
    v_branch_id := (v_raw_meta->>'branch_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_branch_id := NULL;
  END;

  BEGIN
    v_store_id := (v_raw_meta->>'store_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_store_id := NULL;
  END;

  v_role := COALESCE(v_raw_meta->>'role', 'seller');
  v_mapped_role := public.map_role_name(v_role);

  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.company_users
    WHERE user_id = target_user_id
    LIMIT 1;

    IF v_company_id IS NULL THEN
      SELECT id INTO v_company_id
      FROM public.companies
      WHERE is_system_owner = true
      LIMIT 1;
    END IF;
  END IF;

  IF v_branch_id IS NOT NULL THEN
    SELECT id INTO v_valid_branch_id
    FROM public.branches
    WHERE id = v_branch_id
    LIMIT 1;
  END IF;

  IF v_store_id IS NULL AND v_branch_id IS NOT NULL THEN
    SELECT id INTO v_store_id
    FROM public.stores
    WHERE id = v_branch_id
    LIMIT 1;
  END IF;

  IF v_store_id IS NULL AND v_company_id IS NOT NULL THEN
    SELECT id INTO v_store_id
    FROM public.stores
    WHERE company_id = v_company_id
    ORDER BY created_at
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, company_id, branch_id, store_id, status, onboarding_completed)
  VALUES (target_user_id, v_email, v_full_name, v_company_id, v_valid_branch_id, v_store_id, 'active', true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    company_id = COALESCE(EXCLUDED.company_id, public.profiles.company_id),
    branch_id = COALESCE(EXCLUDED.branch_id, public.profiles.branch_id),
    store_id = COALESCE(EXCLUDED.store_id, public.profiles.store_id),
    status = 'active',
    onboarding_completed = true;

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (target_user_id, v_mapped_role::public.app_role, v_company_id)
  ON CONFLICT (user_id, role) DO UPDATE SET
    company_id = COALESCE(EXCLUDED.company_id, public.user_roles.company_id);

  INSERT INTO public.company_users (user_id, company_id, branch_id, role, status)
  VALUES (target_user_id, v_company_id, v_valid_branch_id, v_mapped_role, 'active')
  ON CONFLICT (user_id, company_id) DO UPDATE SET
    role = EXCLUDED.role,
    branch_id = COALESCE(EXCLUDED.branch_id, public.company_users.branch_id),
    status = 'active';

  INSERT INTO public.bootstrap_logs (user_id, step, status, message)
  VALUES (target_user_id, 'manual_sync', 'completed', 'Perfil sincronizado manualmente com sucesso');

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'company_id', v_company_id,
    'role', v_mapped_role,
    'branch_id', v_valid_branch_id,
    'store_id', v_store_id
  );
END;
$function$;