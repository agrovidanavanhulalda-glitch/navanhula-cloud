
DROP FUNCTION IF EXISTS public.complete_onboarding(text,text,text,text);

CREATE FUNCTION public.complete_onboarding(
  p_company_name text,
  p_company_nif text DEFAULT NULL,
  p_company_phone text DEFAULT NULL,
  p_company_address text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_store_id uuid;
  v_existing_company_id uuid;
BEGIN
  SELECT company_id INTO v_existing_company_id FROM profiles WHERE id = v_user_id;
  IF v_existing_company_id IS NOT NULL THEN
    UPDATE profiles SET onboarding_completed = true WHERE id = v_user_id;
    RETURN;
  END IF;

  INSERT INTO companies (name, nif, phone, address, city, country)
  VALUES (p_company_name, p_company_nif, p_company_phone, p_company_address, 'Nampula', 'Moçambique')
  RETURNING id INTO v_company_id;

  INSERT INTO stores (name, company_id, is_active, city)
  VALUES ('Loja Principal', v_company_id, true, 'Nampula')
  RETURNING id INTO v_store_id;

  UPDATE profiles
  SET company_id = v_company_id,
      store_id = v_store_id,
      onboarding_completed = true,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO subscriptions (company_id, store_id, price_monthly, status)
  VALUES (v_company_id, v_store_id, 1500, 'active');
END;
$$;
