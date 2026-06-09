CREATE OR REPLACE FUNCTION public.create_enterprise_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_company_id UUID,
  p_store_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_caller_id UUID;
  v_caller_role TEXT;
  v_result JSONB;
BEGIN
  -- 1. Check if caller is authorized
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT role INTO v_caller_role FROM public.user_roles WHERE user_id = v_caller_id LIMIT 1;
  
  IF v_caller_role NOT IN ('ceo', 'admin', 'master') THEN
    RAISE EXCEPTION 'Permissão negada. Apenas administradores podem criar usuários.';
  END IF;

  -- 2. Create the user in auth.users
  -- Note: This requires service_role or specific permissions, but since we are in SECURITY DEFINER, 
  -- it will use the owner's permissions. However, direct inserts into auth.users are restricted.
  -- We use the admin API approach via a separate edge function usually, but for a direct RPC 
  -- we can try to use the extensions if available, or simpler: just manage the public tables 
  -- and assume the user is created via the standard flow or edge function.
  
  -- Re-evaluating: A direct RPC cannot easily bypass auth.users creation without service_role.
  -- The best way is to keep the logic in the Edge Function and fix the Edge Function.
  
  RETURN jsonb_build_object('status', 'manual_creation_required', 'message', 'Use a Edge Function manage-team-member');
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_enterprise_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_enterprise_user TO service_role;