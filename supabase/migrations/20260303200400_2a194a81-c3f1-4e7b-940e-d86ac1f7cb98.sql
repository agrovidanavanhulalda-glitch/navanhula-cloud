
-- =============================================
-- MÓDULOS AGRÍCOLA E AVICULTURA - NAVANHULA POS
-- =============================================

-- 1) Tabela tipo de negócio por empresa
CREATE TABLE public.business_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  comercio boolean NOT NULL DEFAULT true,
  agricultura boolean NOT NULL DEFAULT false,
  avicultura boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.business_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own company modules" ON public.business_modules
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins manage modules" ON public.business_modules
  FOR ALL USING (company_id = get_user_company(auth.uid()) AND is_admin(auth.uid()));

-- 2) Tabela culturas (agricultura)
CREATE TABLE public.crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  name text NOT NULL,
  area_planted numeric NOT NULL DEFAULT 0,
  planting_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_harvest_date date,
  total_cost numeric NOT NULL DEFAULT 0,
  quantity_harvested numeric DEFAULT 0,
  losses numeric DEFAULT 0,
  expected_profit numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'planted',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company crops" ON public.crops
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers manage crops" ON public.crops
  FOR ALL USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));

-- 3) Tabela insumos agrícolas
CREATE TABLE public.agro_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
  input_type text NOT NULL DEFAULT 'fertilizer',
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agro_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view crop inputs" ON public.agro_inputs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM crops c WHERE c.id = agro_inputs.crop_id AND c.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Managers manage inputs" ON public.agro_inputs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM crops c WHERE c.id = agro_inputs.crop_id AND c.company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid())
  ));

-- 4) Tabela lotes de aves (avicultura)
CREATE TABLE public.poultry_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  batch_name text NOT NULL,
  initial_quantity integer NOT NULL DEFAULT 0,
  current_quantity integer NOT NULL DEFAULT 0,
  mortality integer DEFAULT 0,
  avg_weight numeric DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_slaughter_date date,
  total_cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.poultry_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company batches" ON public.poultry_batches
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers manage batches" ON public.poultry_batches
  FOR ALL USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));

-- 5) Tabela ração de aves
CREATE TABLE public.poultry_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.poultry_batches(id) ON DELETE CASCADE,
  feed_type text NOT NULL DEFAULT 'starter',
  daily_consumption numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  supplier text,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.poultry_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view batch feed" ON public.poultry_feed
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM poultry_batches b WHERE b.id = poultry_feed.batch_id AND b.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Managers manage feed" ON public.poultry_feed
  FOR ALL USING (EXISTS (
    SELECT 1 FROM poultry_batches b WHERE b.id = poultry_feed.batch_id AND b.company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid())
  ));

-- 6) Tabela produção avícola
CREATE TABLE public.poultry_production (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.poultry_batches(id) ON DELETE CASCADE,
  chickens_sold integer DEFAULT 0,
  eggs_produced integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.poultry_production ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view batch production" ON public.poultry_production
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM poultry_batches b WHERE b.id = poultry_production.batch_id AND b.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Managers manage production" ON public.poultry_production
  FOR ALL USING (EXISTS (
    SELECT 1 FROM poultry_batches b WHERE b.id = poultry_production.batch_id AND b.company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid())
  ));

-- 7) Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.crops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poultry_production;

-- 8) Auto-create business_modules row for existing companies
INSERT INTO public.business_modules (company_id, comercio, agricultura, avicultura)
SELECT id, true, false, false FROM public.companies
ON CONFLICT (company_id) DO NOTHING;

-- 9) Trigger to auto-create business_modules on new company
CREATE OR REPLACE FUNCTION public.auto_create_business_modules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_modules (company_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_business_modules
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_business_modules();
