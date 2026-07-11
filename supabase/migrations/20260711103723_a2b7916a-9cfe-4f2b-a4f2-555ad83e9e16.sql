
CREATE OR REPLACE FUNCTION public.founder_business_analytics(p_months int DEFAULT 12)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT ((SELECT is_founder FROM public.profiles WHERE id = auth.uid()) = true) THEN
    RAISE EXCEPTION 'Founder access required';
  END IF;

  WITH months AS (
    SELECT generate_series(
      date_trunc('month', now()) - ((p_months - 1) || ' months')::interval,
      date_trunc('month', now()),
      '1 month'
    )::date AS m
  ),
  rev AS (
    SELECT date_trunc('month', paid_at)::date AS m,
           SUM(total_amount) AS receita,
           COUNT(*) AS faturas
    FROM public.invoices
    WHERE status = 'paid' AND paid_at >= (SELECT MIN(m) FROM months)
    GROUP BY 1
  ),
  novos AS (
    SELECT date_trunc('month', created_at)::date AS m, COUNT(*) AS qtd
    FROM public.companies
    WHERE created_at >= (SELECT MIN(m) FROM months)
    GROUP BY 1
  ),
  cancel AS (
    SELECT date_trunc('month', updated_at)::date AS m, COUNT(*) AS qtd
    FROM public.companies
    WHERE subscription_status = 'canceled' AND updated_at >= (SELECT MIN(m) FROM months)
    GROUP BY 1
  ),
  conv AS (
    SELECT date_trunc('month', converted_at)::date AS m, COUNT(*) AS qtd
    FROM public.leads
    WHERE converted_at IS NOT NULL AND converted_at >= (SELECT MIN(m) FROM months)
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'series', jsonb_agg(jsonb_build_object(
      'month', to_char(months.m, 'YYYY-MM'),
      'receita', COALESCE(rev.receita, 0),
      'mrr', COALESCE(rev.receita, 0),
      'arr', COALESCE(rev.receita, 0) * 12,
      'faturas', COALESCE(rev.faturas, 0),
      'novos_clientes', COALESCE(novos.qtd, 0),
      'cancelamentos', COALESCE(cancel.qtd, 0),
      'churn', CASE WHEN COALESCE(novos.qtd,0) > 0 THEN ROUND((COALESCE(cancel.qtd,0)::numeric / novos.qtd) * 100, 2) ELSE 0 END,
      'conversoes', COALESCE(conv.qtd, 0)
    ) ORDER BY months.m)
  ) INTO v
  FROM months
  LEFT JOIN rev ON rev.m = months.m
  LEFT JOIN novos ON novos.m = months.m
  LEFT JOIN cancel ON cancel.m = months.m
  LEFT JOIN conv ON conv.m = months.m;

  RETURN v;
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_business_analytics(int) TO authenticated;
