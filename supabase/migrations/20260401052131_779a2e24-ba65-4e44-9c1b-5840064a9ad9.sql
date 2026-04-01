
-- Add coordinates to companies for weather lookups
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS longitude numeric;

-- Climate data table
CREATE TABLE public.dados_climaticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.poultry_batches(id) ON DELETE SET NULL,
  temperatura numeric,
  humidade numeric,
  chuva numeric DEFAULT 0,
  vento numeric DEFAULT 0,
  pressao numeric,
  descricao text,
  icone text,
  data timestamptz NOT NULL DEFAULT now(),
  fonte text DEFAULT 'openweathermap',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dados_climaticos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own company climate data" ON public.dados_climaticos
  FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users insert own company climate data" ON public.dados_climaticos
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()));

-- Satellite data table
CREATE TABLE public.dados_satelite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.poultry_batches(id) ON DELETE SET NULL,
  ndvi numeric,
  temperatura_solo numeric,
  radiacao_solar numeric,
  evapotranspiracao numeric,
  indice_stress numeric,
  data date NOT NULL DEFAULT CURRENT_DATE,
  fonte text DEFAULT 'nasa_power',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dados_satelite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own company satellite data" ON public.dados_satelite
  FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users insert own company satellite data" ON public.dados_satelite
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()));

-- Environmental alerts function
CREATE OR REPLACE FUNCTION public.evaluate_environmental_alerts(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_climate RECORD;
  v_satellite RECORD;
  v_count integer := 0;
BEGIN
  -- Get latest climate data
  SELECT * INTO v_climate FROM dados_climaticos
  WHERE company_id = p_company_id
  ORDER BY data DESC LIMIT 1;

  IF FOUND THEN
    -- Heat stress
    IF v_climate.temperatura > 30 THEN
      INSERT INTO insights_ia (company_id, tipo, mensagem, nivel, dados)
      VALUES (p_company_id, 'alerta',
        'Stress térmico: temperatura de ' || ROUND(v_climate.temperatura, 1) || '°C. Aumente ventilação e água.',
        CASE WHEN v_climate.temperatura > 35 THEN 'critico' ELSE 'warning' END,
        jsonb_build_object('temperatura', v_climate.temperatura, 'source', 'climate'));
      v_count := v_count + 1;
    END IF;

    -- High humidity
    IF v_climate.humidade > 80 THEN
      INSERT INTO insights_ia (company_id, tipo, mensagem, nivel, dados)
      VALUES (p_company_id, 'alerta',
        'Humidade elevada: ' || ROUND(v_climate.humidade, 1) || '%. Risco de doenças respiratórias.',
        CASE WHEN v_climate.humidade > 90 THEN 'critico' ELSE 'warning' END,
        jsonb_build_object('humidade', v_climate.humidade, 'source', 'climate'));
      v_count := v_count + 1;
    END IF;

    -- Cold stress
    IF v_climate.temperatura < 15 THEN
      INSERT INTO insights_ia (company_id, tipo, mensagem, nivel, dados)
      VALUES (p_company_id, 'alerta',
        'Temperatura baixa: ' || ROUND(v_climate.temperatura, 1) || '°C. Ative aquecimento.',
        'warning',
        jsonb_build_object('temperatura', v_climate.temperatura, 'source', 'climate'));
      v_count := v_count + 1;
    END IF;

    -- Heavy rain
    IF COALESCE(v_climate.chuva, 0) > 20 THEN
      INSERT INTO insights_ia (company_id, tipo, mensagem, nivel, dados)
      VALUES (p_company_id, 'alerta',
        'Chuva intensa prevista: ' || ROUND(v_climate.chuva, 1) || 'mm. Proteja as instalações.',
        'warning',
        jsonb_build_object('chuva', v_climate.chuva, 'source', 'climate'));
      v_count := v_count + 1;
    END IF;
  END IF;

  -- Get latest satellite data
  SELECT * INTO v_satellite FROM dados_satelite
  WHERE company_id = p_company_id
  ORDER BY data DESC LIMIT 1;

  IF FOUND THEN
    -- Low NDVI
    IF v_satellite.ndvi IS NOT NULL AND v_satellite.ndvi < 0.3 THEN
      INSERT INTO insights_ia (company_id, tipo, mensagem, nivel, dados)
      VALUES (p_company_id, 'alerta',
        'Índice de vegetação (NDVI) baixo: ' || ROUND(v_satellite.ndvi, 2) || '. Ambiente degradado.',
        CASE WHEN v_satellite.ndvi < 0.15 THEN 'critico' ELSE 'warning' END,
        jsonb_build_object('ndvi', v_satellite.ndvi, 'source', 'satellite'));
      v_count := v_count + 1;
    END IF;

    -- High stress index
    IF v_satellite.indice_stress IS NOT NULL AND v_satellite.indice_stress > 0.7 THEN
      INSERT INTO insights_ia (company_id, tipo, mensagem, nivel, dados)
      VALUES (p_company_id, 'alerta',
        'Índice de stress ambiental alto: ' || ROUND(v_satellite.indice_stress, 2) || '. Monitore saúde das aves.',
        'critico',
        jsonb_build_object('indice_stress', v_satellite.indice_stress, 'source', 'satellite'));
      v_count := v_count + 1;
    END IF;
  END IF;

  RETURN v_count;
END;
$$;
