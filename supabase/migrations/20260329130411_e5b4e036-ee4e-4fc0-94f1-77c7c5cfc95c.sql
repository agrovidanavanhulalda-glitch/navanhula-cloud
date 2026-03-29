
-- Table: insights_ia
CREATE TABLE public.insights_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.poultry_batches(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'alerta' CHECK (tipo IN ('alerta', 'recomendacao', 'previsao')),
  mensagem TEXT NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'info' CHECK (nivel IN ('info', 'warning', 'critico')),
  dados JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: ml_features
CREATE TABLE public.ml_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.poultry_batches(id) ON DELETE CASCADE,
  idade_dias INTEGER NOT NULL DEFAULT 0,
  consumo_racao NUMERIC DEFAULT 0,
  mortalidade NUMERIC DEFAULT 0,
  peso_medio NUMERIC DEFAULT 0,
  custo_acumulado NUMERIC DEFAULT 0,
  receita_parcial NUMERIC DEFAULT 0,
  peso_final NUMERIC,
  lucro_final NUMERIC,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.insights_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company insights" ON public.insights_ia
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can insert own company insights" ON public.insights_ia
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can update own company insights" ON public.insights_ia
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can view own company ml_features" ON public.ml_features
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can insert own company ml_features" ON public.ml_features
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- Function: collect ML features from poultry data
CREATE OR REPLACE FUNCTION public.collect_ml_features(p_batch_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch RECORD;
  v_company_id UUID;
  v_age_days INTEGER;
  v_feed NUMERIC;
  v_mortality NUMERIC;
  v_weight NUMERIC;
  v_cost NUMERIC;
  v_revenue NUMERIC;
BEGIN
  SELECT * INTO v_batch FROM poultry_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_company_id := v_batch.company_id;
  v_age_days := EXTRACT(DAY FROM now() - v_batch.start_date::timestamptz)::integer;

  SELECT COALESCE(SUM(feed_consumed_kg), 0) INTO v_feed
  FROM poultry_daily_records WHERE batch_id = p_batch_id;

  v_mortality := CASE WHEN v_batch.initial_quantity > 0
    THEN ROUND(((v_batch.initial_quantity - v_batch.current_quantity)::numeric / v_batch.initial_quantity) * 100, 2)
    ELSE 0 END;

  v_weight := COALESCE(v_batch.avg_weight, 0);
  v_cost := COALESCE(v_batch.total_cost, 0);

  SELECT COALESCE(SUM(revenue), 0) INTO v_revenue
  FROM poultry_production WHERE batch_id = p_batch_id;

  INSERT INTO ml_features (company_id, batch_id, idade_dias, consumo_racao, mortalidade, peso_medio, custo_acumulado, receita_parcial, data)
  VALUES (v_company_id, p_batch_id, v_age_days, v_feed, v_mortality, v_weight, v_cost, v_revenue, CURRENT_DATE)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Function: evaluate poultry rules and generate insights
CREATE OR REPLACE FUNCTION public.evaluate_poultry_insights(p_batch_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch RECORD;
  v_company_id UUID;
  v_mortality_pct NUMERIC;
  v_age_days INTEGER;
  v_avg_feed NUMERIC;
  v_current_feed NUMERIC;
  v_count INTEGER := 0;
  v_input RECORD;
  v_revenue NUMERIC;
  v_estimated_profit NUMERIC;
  v_days_remaining INTEGER;
  v_predicted_weight NUMERIC;
  v_daily_gain NUMERIC;
BEGIN
  SELECT * INTO v_batch FROM poultry_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_company_id := v_batch.company_id;
  v_age_days := GREATEST(EXTRACT(DAY FROM now() - v_batch.start_date::timestamptz)::integer, 1);

  -- Mortality check
  v_mortality_pct := CASE WHEN v_batch.initial_quantity > 0
    THEN ((v_batch.initial_quantity - v_batch.current_quantity)::numeric / v_batch.initial_quantity) * 100
    ELSE 0 END;

  IF v_mortality_pct > 5 THEN
    INSERT INTO insights_ia (company_id, batch_id, tipo, mensagem, nivel, dados)
    VALUES (v_company_id, p_batch_id, 'alerta',
      'Mortalidade alta: ' || ROUND(v_mortality_pct, 1) || '% no lote ' || v_batch.batch_name || '. Verifique saúde, ventilação e água.',
      CASE WHEN v_mortality_pct > 10 THEN 'critico' ELSE 'warning' END,
      jsonb_build_object('mortality_pct', ROUND(v_mortality_pct, 1), 'current_qty', v_batch.current_quantity));
    v_count := v_count + 1;
  END IF;

  -- Feed consumption vs average
  SELECT COALESCE(AVG(feed_consumed_kg), 0) INTO v_avg_feed
  FROM poultry_daily_records WHERE batch_id = p_batch_id;

  SELECT COALESCE(feed_consumed_kg, 0) INTO v_current_feed
  FROM poultry_daily_records WHERE batch_id = p_batch_id
  ORDER BY record_date DESC LIMIT 1;

  IF v_avg_feed > 0 AND v_current_feed > v_avg_feed * 1.3 THEN
    INSERT INTO insights_ia (company_id, batch_id, tipo, mensagem, nivel, dados)
    VALUES (v_company_id, p_batch_id, 'alerta',
      'Consumo de ração acima da média (+30%) no lote ' || v_batch.batch_name || '. Considere ajustar a dosagem.',
      'warning',
      jsonb_build_object('current', v_current_feed, 'average', ROUND(v_avg_feed, 2)));
    v_count := v_count + 1;
  END IF;

  -- Low stock inputs
  FOR v_input IN
    SELECT name, balance, low_stock_threshold
    FROM poultry_inputs
    WHERE batch_id = p_batch_id AND balance IS NOT NULL AND low_stock_threshold IS NOT NULL
      AND balance <= low_stock_threshold * 0.2
  LOOP
    INSERT INTO insights_ia (company_id, batch_id, tipo, mensagem, nivel, dados)
    VALUES (v_company_id, p_batch_id, 'alerta',
      'Estoque crítico: ' || v_input.name || ' com apenas ' || v_input.balance || ' restantes.',
      'critico',
      jsonb_build_object('input', v_input.name, 'balance', v_input.balance));
    v_count := v_count + 1;
  END LOOP;

  -- Profit estimation
  SELECT COALESCE(SUM(revenue), 0) INTO v_revenue
  FROM poultry_production WHERE batch_id = p_batch_id;

  v_estimated_profit := v_revenue - COALESCE(v_batch.total_cost, 0);

  IF v_estimated_profit < 0 AND v_age_days > 14 THEN
    INSERT INTO insights_ia (company_id, batch_id, tipo, mensagem, nivel, dados)
    VALUES (v_company_id, p_batch_id, 'recomendacao',
      'Lote ' || v_batch.batch_name || ' ainda está com prejuízo de ' || ABS(ROUND(v_estimated_profit, 0)) || ' MT. Avalie custos ou antecipe vendas.',
      'warning',
      jsonb_build_object('estimated_profit', ROUND(v_estimated_profit, 0), 'revenue', v_revenue, 'cost', v_batch.total_cost));
    v_count := v_count + 1;
  END IF;

  -- Weight prediction
  IF COALESCE(v_batch.avg_weight, 0) > 0 AND v_age_days > 7 THEN
    v_daily_gain := v_batch.avg_weight / v_age_days;
    v_days_remaining := CASE
      WHEN v_batch.expected_slaughter_date IS NOT NULL
      THEN GREATEST(EXTRACT(DAY FROM v_batch.expected_slaughter_date::timestamptz - now())::integer, 0)
      ELSE 14 END;
    v_predicted_weight := v_batch.avg_weight + (v_daily_gain * v_days_remaining);

    INSERT INTO insights_ia (company_id, batch_id, tipo, mensagem, nivel, dados)
    VALUES (v_company_id, p_batch_id, 'previsao',
      'Peso previsto para o lote ' || v_batch.batch_name || ': ' || ROUND(v_predicted_weight, 2) || ' kg em ' || v_days_remaining || ' dias.',
      'info',
      jsonb_build_object('current_weight', v_batch.avg_weight, 'predicted_weight', ROUND(v_predicted_weight, 2), 'daily_gain', ROUND(v_daily_gain, 3), 'days_remaining', v_days_remaining));
    v_count := v_count + 1;

    -- Profit prediction
    INSERT INTO insights_ia (company_id, batch_id, tipo, mensagem, nivel, dados)
    VALUES (v_company_id, p_batch_id, 'previsao',
      'Lucro estimado lote ' || v_batch.batch_name || ': ' || ROUND(v_estimated_profit, 0) || ' MT (receita: ' || ROUND(v_revenue, 0) || ' / custo: ' || ROUND(COALESCE(v_batch.total_cost, 0), 0) || ').',
      CASE WHEN v_estimated_profit >= 0 THEN 'info' ELSE 'warning' END,
      jsonb_build_object('estimated_profit', ROUND(v_estimated_profit, 0), 'revenue', v_revenue, 'cost', v_batch.total_cost));
    v_count := v_count + 1;
  END IF;

  -- Collect ML features
  PERFORM collect_ml_features(p_batch_id);

  RETURN v_count;
END;
$$;
