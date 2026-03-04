
CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_full_name text;
  v_store_id uuid;
  v_raw_meta jsonb;
BEGIN
  -- Extract email from JWT
  v_email := nullif(current_setting('request.jwt.claim.email', true), '');

  IF v_email IS NULL THEN
    v_email := auth.uid()::text || '@user.local';
  END IF;

  -- Try to get full_name from user metadata (set during signup)
  SELECT raw_user_meta_data INTO v_raw_meta FROM auth.users WHERE id = auth.uid();
  v_full_name := v_raw_meta ->> 'full_name';

  -- Fallback to email prefix, but never use a UUID
  IF v_full_name IS NULL OR length(trim(v_full_name)) = 0 THEN
    v_full_name := split_part(v_email, '@', 1);
  END IF;
  
  -- If still looks like a UUID, use generic name
  IF v_full_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_full_name := 'Usuário';
  END IF;

  -- Ensure there is at least one store
  IF NOT EXISTS (SELECT 1 FROM public.stores) THEN
    INSERT INTO public.stores (name, is_active)
    VALUES ('Loja Principal', true)
    RETURNING id INTO v_store_id;
  ELSE
    SELECT id INTO v_store_id
    FROM public.stores
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;
  END IF;

  -- Ensure profile exists
  INSERT INTO public.profiles (id, email, full_name, store_id, is_active)
  VALUES (auth.uid(), v_email, v_full_name, v_store_id, true)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE 
          WHEN public.profiles.full_name IS NULL 
            OR length(trim(public.profiles.full_name)) = 0 
            OR public.profiles.full_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN EXCLUDED.full_name
          ELSE public.profiles.full_name
        END,
        store_id = COALESCE(public.profiles.store_id, EXCLUDED.store_id),
        is_active = COALESCE(public.profiles.is_active, true);

  -- Role auto-assignment
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
$function$;

-- Fix existing profiles that have UUID as full_name
UPDATE public.profiles
SET full_name = split_part(email, '@', 1)
WHERE full_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
