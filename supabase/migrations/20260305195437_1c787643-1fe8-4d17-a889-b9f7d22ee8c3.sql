DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reseller_status') THEN
    CREATE TYPE public.reseller_status AS ENUM ('active', 'suspended');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_signup_status') THEN
    CREATE TYPE public.referral_signup_status AS ENUM ('captured', 'converted');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reseller_commission_status') THEN
    CREATE TYPE public.reseller_commission_status AS ENUM ('pending', 'paid', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reseller_payout_status') THEN
    CREATE TYPE public.reseller_payout_status AS ENUM ('pending', 'paid');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reseller_material_type') THEN
    CREATE TYPE public.reseller_material_type AS ENUM ('presentation', 'video', 'image', 'sales_copy', 'manual');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_reseller_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'AGENTE' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.resellers WHERE referral_code = v_code);
  END LOOP;

  RETURN v_code;
END;
$$;

CREATE TABLE IF NOT EXISTS public.resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL UNIQUE,
  city text,
  country text NOT NULL DEFAULT 'Moçambique',
  document_id text,
  referral_code text NOT NULL UNIQUE DEFAULT public.generate_reseller_code(),
  status public.reseller_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  referred_user_id uuid UNIQUE,
  company_id uuid UNIQUE REFERENCES public.companies(id) ON DELETE SET NULL,
  referred_email text,
  referral_code text NOT NULL,
  status public.referral_signup_status NOT NULL DEFAULT 'captured',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  converted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.reseller_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  referral_signup_id uuid UNIQUE REFERENCES public.referral_signups(id) ON DELETE SET NULL,
  primary_contact_email text,
  status text NOT NULL DEFAULT 'active',
  total_revenue numeric NOT NULL DEFAULT 0,
  total_commission_generated numeric NOT NULL DEFAULT 0,
  total_commission_paid numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reseller_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reseller_client_id uuid REFERENCES public.reseller_clients(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  payment_transaction_id uuid NOT NULL UNIQUE REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  commission_rate numeric NOT NULL DEFAULT 30,
  payment_amount numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status public.reseller_commission_status NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reseller_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  status public.reseller_payout_status NOT NULL DEFAULT 'pending',
  reference text,
  notes text,
  paid_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reseller_payout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.reseller_payouts(id) ON DELETE CASCADE,
  commission_id uuid NOT NULL UNIQUE REFERENCES public.reseller_commissions(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reseller_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  material_type public.reseller_material_type NOT NULL,
  asset_url text,
  content_text text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  referred_user_id uuid,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  referral_code text,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resellers_profile_id ON public.resellers(profile_id);
CREATE INDEX IF NOT EXISTS idx_resellers_status ON public.resellers(status);
CREATE INDEX IF NOT EXISTS idx_referral_signups_reseller_id ON public.referral_signups(reseller_id);
CREATE INDEX IF NOT EXISTS idx_referral_signups_company_id ON public.referral_signups(company_id);
CREATE INDEX IF NOT EXISTS idx_reseller_clients_reseller_id ON public.reseller_clients(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_reseller_id ON public.reseller_commissions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_company_id ON public.reseller_commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_status ON public.reseller_commissions(status);
CREATE INDEX IF NOT EXISTS idx_reseller_payouts_reseller_id ON public.reseller_payouts(reseller_id);
CREATE INDEX IF NOT EXISTS idx_referral_logs_reseller_id ON public.referral_logs(reseller_id);

ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_payout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage resellers" ON public.resellers;
CREATE POLICY "Admins manage resellers"
ON public.resellers
FOR ALL
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'));

DROP POLICY IF EXISTS "Resellers view own profile" ON public.resellers;
CREATE POLICY "Resellers view own profile"
ON public.resellers
FOR SELECT
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins view referral signups" ON public.referral_signups;
CREATE POLICY "Admins view referral signups"
ON public.referral_signups
FOR SELECT
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'));

DROP POLICY IF EXISTS "Resellers view own signups" ON public.referral_signups;
CREATE POLICY "Resellers view own signups"
ON public.referral_signups
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.resellers r
  WHERE r.id = referral_signups.reseller_id
    AND r.profile_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins manage reseller clients" ON public.reseller_clients;
CREATE POLICY "Admins manage reseller clients"
ON public.reseller_clients
FOR ALL
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'));

DROP POLICY IF EXISTS "Resellers view own clients" ON public.reseller_clients;
CREATE POLICY "Resellers view own clients"
ON public.reseller_clients
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.resellers r
  WHERE r.id = reseller_clients.reseller_id
    AND r.profile_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins manage reseller commissions" ON public.reseller_commissions;
CREATE POLICY "Admins manage reseller commissions"
ON public.reseller_commissions
FOR ALL
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'));

DROP POLICY IF EXISTS "Resellers view own commissions" ON public.reseller_commissions;
CREATE POLICY "Resellers view own commissions"
ON public.reseller_commissions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.resellers r
  WHERE r.id = reseller_commissions.reseller_id
    AND r.profile_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins manage reseller payouts" ON public.reseller_payouts;
CREATE POLICY "Admins manage reseller payouts"
ON public.reseller_payouts
FOR ALL
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'));

DROP POLICY IF EXISTS "Resellers view own payouts" ON public.reseller_payouts;
CREATE POLICY "Resellers view own payouts"
ON public.reseller_payouts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.resellers r
  WHERE r.id = reseller_payouts.reseller_id
    AND r.profile_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins manage payout items" ON public.reseller_payout_items;
CREATE POLICY "Admins manage payout items"
ON public.reseller_payout_items
FOR ALL
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'));

DROP POLICY IF EXISTS "Resellers view own payout items" ON public.reseller_payout_items;
CREATE POLICY "Resellers view own payout items"
ON public.reseller_payout_items
FOR SELECT
USING (EXISTS (
  SELECT 1
  FROM public.reseller_payouts rp
  JOIN public.resellers r ON r.id = rp.reseller_id
  WHERE rp.id = reseller_payout_items.payout_id
    AND r.profile_id = auth.uid()
));

DROP POLICY IF EXISTS "Authenticated users view active reseller materials" ON public.reseller_materials;
CREATE POLICY "Authenticated users view active reseller materials"
ON public.reseller_materials
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage reseller materials" ON public.reseller_materials;
CREATE POLICY "Admins manage reseller materials"
ON public.reseller_materials
FOR ALL
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'));

DROP POLICY IF EXISTS "Admins view referral logs" ON public.referral_logs;
CREATE POLICY "Admins view referral logs"
ON public.referral_logs
FOR SELECT
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'ceo'));

DROP POLICY IF EXISTS "Resellers view own referral logs" ON public.referral_logs;
CREATE POLICY "Resellers view own referral logs"
ON public.referral_logs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.resellers r
  WHERE r.id = referral_logs.reseller_id
    AND r.profile_id = auth.uid()
));

CREATE OR REPLACE FUNCTION public.get_reseller_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.resellers WHERE profile_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_reseller(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'reseller')
$$;

CREATE OR REPLACE FUNCTION public.capture_referral_for_user(_user_id uuid, _email text, _referral_code text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller record;
BEGIN
  IF _referral_code IS NULL OR length(trim(_referral_code)) = 0 THEN
    RETURN;
  END IF;

  SELECT * INTO v_reseller
  FROM public.resellers
  WHERE referral_code = upper(trim(_referral_code))
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_reseller.profile_id = _user_id THEN
    RETURN;
  END IF;

  INSERT INTO public.referral_signups (reseller_id, referred_user_id, referred_email, referral_code, metadata)
  VALUES (v_reseller.id, _user_id, lower(trim(_email)), v_reseller.referral_code, COALESCE(_metadata, '{}'::jsonb))
  ON CONFLICT (referred_user_id) DO NOTHING;

  INSERT INTO public.referral_logs (reseller_id, referred_user_id, referral_code, event_type, metadata)
  VALUES (v_reseller.id, _user_id, v_reseller.referral_code, 'signup_captured', COALESCE(_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.link_referral_company(_user_id uuid, _company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup record;
  v_email text;
BEGIN
  SELECT * INTO v_signup
  FROM public.referral_signups
  WHERE referred_user_id = _user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = _user_id;

  UPDATE public.referral_signups
  SET company_id = _company_id,
      status = 'converted',
      converted_at = now()
  WHERE id = v_signup.id;

  INSERT INTO public.reseller_clients (reseller_id, company_id, referral_signup_id, primary_contact_email)
  VALUES (v_signup.reseller_id, _company_id, v_signup.id, v_email)
  ON CONFLICT (company_id) DO NOTHING;

  INSERT INTO public.referral_logs (reseller_id, referred_user_id, company_id, referral_code, event_type, metadata)
  VALUES (v_signup.reseller_id, _user_id, _company_id, v_signup.referral_code, 'company_converted', jsonb_build_object('company_id', _company_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.process_reseller_commission(_payment_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx record;
  v_client record;
  v_commission numeric;
BEGIN
  SELECT * INTO v_tx
  FROM public.payment_transactions
  WHERE id = _payment_transaction_id;

  IF NOT FOUND OR v_tx.status <> 'completed' THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.reseller_commissions WHERE payment_transaction_id = v_tx.id) THEN
    RETURN;
  END IF;

  SELECT rc.* INTO v_client
  FROM public.reseller_clients rc
  WHERE rc.company_id = v_tx.company_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_commission := round((COALESCE(v_tx.amount, 0) * 30.0) / 100.0, 2);

  INSERT INTO public.reseller_commissions (
    reseller_id,
    company_id,
    reseller_client_id,
    subscription_id,
    payment_transaction_id,
    commission_rate,
    payment_amount,
    commission_amount,
    status
  ) VALUES (
    v_client.reseller_id,
    v_tx.company_id,
    v_client.id,
    v_tx.subscription_id,
    v_tx.id,
    30,
    COALESCE(v_tx.amount, 0),
    v_commission,
    'pending'
  );

  UPDATE public.reseller_clients
  SET total_revenue = total_revenue + COALESCE(v_tx.amount, 0),
      total_commission_generated = total_commission_generated + v_commission,
      updated_at = now()
  WHERE id = v_client.id;

  INSERT INTO public.referral_logs (reseller_id, company_id, event_type, metadata)
  VALUES (
    v_client.reseller_id,
    v_tx.company_id,
    'commission_generated',
    jsonb_build_object(
      'payment_transaction_id', v_tx.id,
      'subscription_id', v_tx.subscription_id,
      'payment_amount', v_tx.amount,
      'commission_amount', v_commission
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_reseller_commission_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.process_reseller_commission(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reseller_commission_on_payment_transactions ON public.payment_transactions;
CREATE TRIGGER trg_reseller_commission_on_payment_transactions
AFTER INSERT OR UPDATE OF status ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_reseller_commission_trigger();

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_company_name text,
  p_company_nif text DEFAULT NULL::text,
  p_company_phone text DEFAULT NULL::text,
  p_company_address text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_company_id uuid;
    v_store_id uuid;
    v_existing_company uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    SELECT company_id INTO v_existing_company
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_existing_company IS NOT NULL THEN
        RAISE EXCEPTION 'User already has a company assigned';
    END IF;

    INSERT INTO public.companies (name, nif, phone, address)
    VALUES (p_company_name, p_company_nif, p_company_phone, p_company_address)
    RETURNING id INTO v_company_id;

    INSERT INTO public.stores (name, company_id, is_active)
    VALUES ('Loja Principal', v_company_id, true)
    RETURNING id INTO v_store_id;

    UPDATE public.profiles
    SET company_id = v_company_id,
        store_id = v_store_id,
        onboarding_completed = true,
        is_active = true,
        updated_at = now()
    WHERE id = v_user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    PERFORM public.link_referral_company(v_user_id, v_company_id);

    RETURN json_build_object(
        'success', true,
        'company_id', v_company_id,
        'store_id', v_store_id,
        'message', 'Empresa criada com sucesso. Bem-vindo ao NAVANHULA POS.'
    );
END;
$$;

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
  v_raw_meta jsonb;
  v_referral_code text;
BEGIN
  v_email := nullif(current_setting('request.jwt.claim.email', true), '');

  IF v_email IS NULL THEN
    v_email := auth.uid()::text || '@user.local';
  END IF;

  SELECT raw_user_meta_data INTO v_raw_meta FROM auth.users WHERE id = auth.uid();
  v_full_name := v_raw_meta ->> 'full_name';
  v_referral_code := upper(trim(COALESCE(v_raw_meta ->> 'referral_code', '')));

  IF v_full_name IS NULL OR length(trim(v_full_name)) = 0 THEN
    v_full_name := split_part(v_email, '@', 1);
  END IF;
  
  IF v_full_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_full_name := 'Usuário';
  END IF;

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

  UPDATE public.resellers
  SET profile_id = auth.uid(),
      updated_at = now()
  WHERE profile_id IS NULL
    AND lower(email) = lower(v_email);

  IF EXISTS (SELECT 1 FROM public.resellers WHERE profile_id = auth.uid()) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'reseller')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

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

  PERFORM public.capture_referral_for_user(
    auth.uid(),
    v_email,
    NULLIF(v_referral_code, ''),
    jsonb_build_object('source', 'signup_metadata')
  );
END;
$$;

DROP TRIGGER IF EXISTS update_resellers_updated_at ON public.resellers;
CREATE TRIGGER update_resellers_updated_at
BEFORE UPDATE ON public.resellers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reseller_clients_updated_at ON public.reseller_clients;
CREATE TRIGGER update_reseller_clients_updated_at
BEFORE UPDATE ON public.reseller_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reseller_commissions_updated_at ON public.reseller_commissions;
CREATE TRIGGER update_reseller_commissions_updated_at
BEFORE UPDATE ON public.reseller_commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reseller_payouts_updated_at ON public.reseller_payouts;
CREATE TRIGGER update_reseller_payouts_updated_at
BEFORE UPDATE ON public.reseller_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reseller_materials_updated_at ON public.reseller_materials;
CREATE TRIGGER update_reseller_materials_updated_at
BEFORE UPDATE ON public.reseller_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.reseller_materials (title, description, material_type, content_text)
SELECT 'Apresentação NAVANHULA POS', 'Estrutura comercial para apresentar o sistema a novos clientes.', 'presentation', 'Apresente como o sistema controla vendas, estoque, caixa e relatórios em tempo real.'
WHERE NOT EXISTS (SELECT 1 FROM public.reseller_materials WHERE title = 'Apresentação NAVANHULA POS');

INSERT INTO public.reseller_materials (title, description, material_type, content_text)
SELECT 'Vídeo de demonstração', 'Guia curto para mostrar o funcionamento do sistema aos clientes.', 'video', 'Demonstre cadastro de produtos, vendas rápidas, relatórios e controlo de caixa.'
WHERE NOT EXISTS (SELECT 1 FROM public.reseller_materials WHERE title = 'Vídeo de demonstração');

INSERT INTO public.reseller_materials (title, description, material_type, content_text)
SELECT 'Textos de venda', 'Mensagens prontas para WhatsApp, e-mail e redes sociais.', 'sales_copy', 'Mostre os benefícios: mais controlo, menos perdas e decisões mais rápidas.'
WHERE NOT EXISTS (SELECT 1 FROM public.reseller_materials WHERE title = 'Textos de venda');

INSERT INTO public.reseller_materials (title, description, material_type, content_text)
SELECT 'Manual do produto', 'Resumo funcional do NAVANHULA POS para apoio às apresentações.', 'manual', 'Inclui módulos de vendas, estoque, multi-loja, financeiro, carteira e relatórios.'
WHERE NOT EXISTS (SELECT 1 FROM public.reseller_materials WHERE title = 'Manual do produto');