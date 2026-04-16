
-- ============================================================
-- NAVANHULA CLOUD - SYSTEM RECOVERY MIGRATION
-- ============================================================

-- 1. Clean up orphan profiles with no company
DELETE FROM public.profiles WHERE company_id IS NULL AND onboarding_completed = false;

-- 2. Create Master Company
INSERT INTO public.companies (id, name, company_type, is_system_owner, billing_exempt, is_active, country, city, currency)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'NAVANHULA GROUP SA',
  'master',
  true,
  true,
  true,
  'Moçambique',
  'Nampula',
  'MZN'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Default Store
INSERT INTO public.stores (id, name, company_id, is_active, city)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Loja Principal',
  'a0000000-0000-0000-0000-000000000001',
  true,
  'Nampula'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Create profiles for all auth users that don't have profiles yet
INSERT INTO public.profiles (id, email, full_name, company_id, store_id, is_active, onboarding_completed)
SELECT 
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    split_part(u.email, '@', 1)
  ),
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  true,
  true
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO UPDATE SET
  company_id = 'a0000000-0000-0000-0000-000000000001',
  store_id = COALESCE(public.profiles.store_id, 'b0000000-0000-0000-0000-000000000001'),
  onboarding_completed = true,
  is_active = true;

-- 5. Fix existing profiles that have no company
UPDATE public.profiles 
SET company_id = 'a0000000-0000-0000-0000-000000000001',
    store_id = COALESCE(store_id, 'b0000000-0000-0000-0000-000000000001'),
    onboarding_completed = true
WHERE company_id IS NULL;

-- 6. Fix email for profiles that have placeholder emails
UPDATE public.profiles p
SET email = u.email,
    full_name = CASE 
      WHEN p.full_name = 'Usuário' OR p.full_name IS NULL OR p.full_name ~ '^[0-9a-f]{8}-'
      THEN COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1))
      ELSE p.full_name
    END
FROM auth.users u
WHERE p.id = u.id AND (p.email LIKE '%@user.local' OR p.email IS NULL);

-- 7. Assign roles - clear and re-create
DELETE FROM public.user_roles;

-- CEO
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'ceo' FROM auth.users WHERE email = 'ceo@navanhula.co.mz'
ON CONFLICT (user_id, role) DO NOTHING;

-- Directors
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'director' FROM auth.users WHERE email LIKE 'diretor%@navanhula.co.mz'
ON CONFLICT (user_id, role) DO NOTHING;

-- Managers
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'manager' FROM auth.users WHERE email LIKE 'gestor%@navanhula.co.mz'
ON CONFLICT (user_id, role) DO NOTHING;

-- HR
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'hr' FROM auth.users WHERE email LIKE 'rh%@navanhula.co.mz'
ON CONFLICT (user_id, role) DO NOTHING;

-- Cashiers
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'cashier' FROM auth.users WHERE email LIKE 'caixa%@navanhula.co.mz'
ON CONFLICT (user_id, role) DO NOTHING;

-- Resellers
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'reseller' FROM auth.users WHERE email LIKE 'revendedor%@navanhula.co.mz'
ON CONFLICT (user_id, role) DO NOTHING;

-- Other users get admin role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. Create subscription for master company
INSERT INTO public.subscriptions (company_id, store_id, price_monthly, status)
VALUES ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 0, 'active')
ON CONFLICT DO NOTHING;

-- 9. Create business_modules for master company
INSERT INTO public.business_modules (company_id, comercio, agricultura, avicultura)
VALUES ('a0000000-0000-0000-0000-000000000001', true, true, true)
ON CONFLICT (company_id) DO NOTHING;

-- ============================================================
-- 10. Fix bootstrap_current_user to link to master company
-- ============================================================
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
  v_company_id uuid;
  v_raw_meta jsonb;
  v_referral_code text;
BEGIN
  -- Get master company
  SELECT id INTO v_company_id FROM public.companies WHERE is_system_owner = true LIMIT 1;
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
  END IF;

  -- Get email
  v_email := nullif(current_setting('request.jwt.claim.email', true), '');
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  END IF;
  IF v_email IS NULL THEN
    v_email := auth.uid()::text || '@user.local';
  END IF;

  -- Get full name
  SELECT raw_user_meta_data INTO v_raw_meta FROM auth.users WHERE id = auth.uid();
  v_full_name := v_raw_meta ->> 'full_name';
  v_referral_code := upper(trim(COALESCE(v_raw_meta ->> 'referral_code', '')));

  IF v_full_name IS NULL OR length(trim(v_full_name)) = 0 THEN
    v_full_name := split_part(v_email, '@', 1);
  END IF;
  IF v_full_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-' THEN
    v_full_name := 'Usuário';
  END IF;

  -- Get store (prefer one from the company)
  SELECT id INTO v_store_id FROM public.stores WHERE company_id = v_company_id AND is_active = true ORDER BY created_at LIMIT 1;
  IF v_store_id IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.stores) THEN
      INSERT INTO public.stores (name, company_id, is_active)
      VALUES ('Loja Principal', v_company_id, true)
      RETURNING id INTO v_store_id;
    ELSE
      SELECT id INTO v_store_id FROM public.stores ORDER BY created_at LIMIT 1;
    END IF;
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (id, email, full_name, company_id, store_id, is_active, onboarding_completed)
  VALUES (auth.uid(), v_email, v_full_name, v_company_id, v_store_id, true, true)
  ON CONFLICT (id) DO UPDATE
    SET email = CASE WHEN public.profiles.email LIKE '%@user.local' THEN EXCLUDED.email ELSE public.profiles.email END,
        full_name = CASE 
          WHEN public.profiles.full_name IS NULL 
            OR length(trim(public.profiles.full_name)) = 0 
            OR public.profiles.full_name ~ '^[0-9a-f]{8}-'
            OR public.profiles.full_name = 'Usuário'
          THEN EXCLUDED.full_name
          ELSE public.profiles.full_name
        END,
        company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
        store_id = COALESCE(public.profiles.store_id, EXCLUDED.store_id),
        onboarding_completed = true,
        is_active = COALESCE(public.profiles.is_active, true);

  -- Handle reseller linking
  UPDATE public.resellers
  SET profile_id = auth.uid(), updated_at = now()
  WHERE profile_id IS NULL AND lower(email) = lower(v_email);

  IF EXISTS (SELECT 1 FROM public.resellers WHERE profile_id = auth.uid()) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'reseller')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Assign default role if none exists
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'seller')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  -- Handle referral
  PERFORM public.capture_referral_for_user(
    auth.uid(), v_email, NULLIF(v_referral_code, ''),
    jsonb_build_object('source', 'signup_metadata')
  );
END;
$$;

-- ============================================================
-- 11. Fix complete_onboarding to use existing master company
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_onboarding(
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
  -- Check if user already has a company
  SELECT company_id INTO v_existing_company_id FROM profiles WHERE id = v_user_id;
  IF v_existing_company_id IS NOT NULL THEN
    UPDATE profiles SET onboarding_completed = true WHERE id = v_user_id;
    RETURN;
  END IF;

  -- Try to find master company first
  SELECT id INTO v_company_id FROM companies WHERE is_system_owner = true LIMIT 1;
  
  IF v_company_id IS NULL THEN
    -- Create new company only if no master exists
    INSERT INTO companies (name, nif, phone, address, city, country)
    VALUES (p_company_name, p_company_nif, p_company_phone, p_company_address, 'Nampula', 'Moçambique')
    RETURNING id INTO v_company_id;
  END IF;

  -- Get or create store
  SELECT id INTO v_store_id FROM stores WHERE company_id = v_company_id AND is_active = true ORDER BY created_at LIMIT 1;
  IF v_store_id IS NULL THEN
    INSERT INTO stores (name, company_id, is_active, city)
    VALUES ('Loja Principal', v_company_id, true, 'Nampula')
    RETURNING id INTO v_store_id;
  END IF;

  -- Update profile
  UPDATE profiles
  SET company_id = v_company_id,
      store_id = v_store_id,
      onboarding_completed = true,
      updated_at = now()
  WHERE id = v_user_id;

  -- Ensure role exists
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create subscription if needed
  IF NOT EXISTS (SELECT 1 FROM subscriptions WHERE company_id = v_company_id) THEN
    INSERT INTO subscriptions (company_id, store_id, price_monthly, status)
    VALUES (v_company_id, v_store_id, 0, 'active');
  END IF;
END;
$$;
