
-- 1. Poultry Inputs (Smart Input Management)
CREATE TABLE public.poultry_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.poultry_batches(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'racao' CHECK (input_type IN ('racao', 'antibiotico', 'carvao', 'vacina', 'energia', 'agua', 'outros')),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('saco', 'litro', 'kg', 'dose', 'kWh', 'unidade')),
  quantity_received NUMERIC NOT NULL DEFAULT 0,
  quantity_used NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (quantity_received - quantity_used) STORED,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity_received * unit_cost) STORED,
  supplier TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_date DATE,
  low_stock_threshold NUMERIC DEFAULT 10,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.poultry_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company poultry inputs"
  ON public.poultry_inputs FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- 2. Operational Costs
CREATE TABLE public.poultry_operational_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.poultry_batches(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  cost_type TEXT NOT NULL DEFAULT 'energia' CHECK (cost_type IN ('energia', 'combustivel', 'agua', 'mao_de_obra', 'manutencao', 'transporte', 'outros')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'kWh',
  cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.poultry_operational_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company poultry costs"
  ON public.poultry_operational_costs FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- 3. Daily mortality tracking table
CREATE TABLE public.poultry_daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.poultry_batches(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mortality_count INTEGER NOT NULL DEFAULT 0,
  avg_weight_kg NUMERIC,
  feed_consumed_kg NUMERIC DEFAULT 0,
  water_consumed_liters NUMERIC DEFAULT 0,
  temperature_celsius NUMERIC,
  humidity_percent NUMERIC,
  observations TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, record_date)
);

ALTER TABLE public.poultry_daily_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company daily records"
  ON public.poultry_daily_records FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- Trigger to update batch mortality/current_quantity on daily record insert
CREATE OR REPLACE FUNCTION public.update_batch_on_daily_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.mortality_count > 0 THEN
    UPDATE poultry_batches
    SET mortality = COALESCE(mortality, 0) + NEW.mortality_count,
        current_quantity = GREATEST(0, current_quantity - NEW.mortality_count),
        updated_at = now()
    WHERE id = NEW.batch_id;
  END IF;

  IF NEW.avg_weight_kg IS NOT NULL THEN
    UPDATE poultry_batches
    SET avg_weight = NEW.avg_weight_kg,
        updated_at = now()
    WHERE id = NEW.batch_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_batch_daily
  AFTER INSERT ON public.poultry_daily_records
  FOR EACH ROW EXECUTE FUNCTION public.update_batch_on_daily_record();

-- Trigger to auto-update batch total_cost when inputs are added
CREATE OR REPLACE FUNCTION public.update_batch_cost_on_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE poultry_batches
  SET total_cost = (
    SELECT COALESCE(SUM(quantity_received * unit_cost), 0)
    FROM poultry_inputs WHERE batch_id = NEW.batch_id
  ) + (
    SELECT COALESCE(SUM(amount), 0)
    FROM poultry_operational_costs WHERE batch_id = NEW.batch_id
  ),
  updated_at = now()
  WHERE id = NEW.batch_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_cost_on_input
  AFTER INSERT OR UPDATE OR DELETE ON public.poultry_inputs
  FOR EACH ROW EXECUTE FUNCTION public.update_batch_cost_on_input();

CREATE TRIGGER trg_update_cost_on_opcost
  AFTER INSERT OR UPDATE OR DELETE ON public.poultry_operational_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_batch_cost_on_input();
