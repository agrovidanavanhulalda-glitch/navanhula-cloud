-- Bootstrap function to make the app usable immediately after first login
-- هدف: criar perfil/loja automaticamente e atribuir role sem configuração manual

CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_store_id uuid;
BEGIN
  -- Extract email from JWT (available for authenticated requests)
  v_email := nullif(current_setting('request.jwt.claim.email', true), '');

  IF v_email IS NULL THEN
    -- fallback (should be rare)
    v_email := auth.uid()::text || '@user.local';
  END IF;

  v_full_name := split_part(v_email, '@', 1);
  IF v_full_name IS NULL OR length(trim(v_full_name)) = 0 THEN
    v_full_name := 'Usuário';
  END IF;

  -- Ensure there is at least one store (global default)
  IF NOT EXISTS (SELECT 1 FROM public.stores) THEN
    INSERT INTO public.stores (name, is_active)
    VALUES ('Loja Principal', true)
    RETURNING id INTO v_store_id;
  ELSE
    -- Pick an existing store as default
    SELECT id INTO v_store_id
    FROM public.stores
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;
  END IF;

  -- Ensure profile exists; also ensure it has a store_id so the app can query store-scoped data
  INSERT INTO public.profiles (id, email, full_name, store_id, is_active)
  VALUES (auth.uid(), v_email, v_full_name, v_store_id, true)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
        store_id = COALESCE(public.profiles.store_id, EXCLUDED.store_id),
        is_active = COALESCE(public.profiles.is_active, true);

  -- Role auto-assignment:
  -- 1) If no roles exist in the system yet, make this first user ADMIN
  -- 2) Otherwise ensure this user has at least SELLER
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (auth.uid(), 'seller')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- Allow authenticated users to call bootstrap (function is SECURITY DEFINER, but execution must be permitted)
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_current_user() FROM anon;
