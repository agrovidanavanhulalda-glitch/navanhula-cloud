CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role text;
  v_full_name text;
BEGIN
  -- Extract metadata from the auth.users table
  v_company_id := (new.raw_user_meta_data->>'company_id')::uuid;
  v_role := new.raw_user_meta_data->>'role';
  v_full_name := new.raw_user_meta_data->>'full_name';

  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, company_id)
  VALUES (new.id, v_full_name, v_company_id)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      company_id = EXCLUDED.company_id;

  -- 2. Link User to Company if not already linked
  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.user_company (user_id, company_id)
    VALUES (new.id, v_company_id)
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;

  -- 3. Assign Role
  IF v_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (new.id, v_role, v_company_id)
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        company_id = EXCLUDED.company_id;
  END IF;

  RETURN new;
END;
$$;