
CREATE OR REPLACE FUNCTION public.founder_platform_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: founder only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'companies_total',    (SELECT count(*) FROM public.companies),
    'companies_active',   (SELECT count(*) FROM public.companies WHERE COALESCE(status,'active') = 'active'),
    'companies_blocked',  (SELECT count(*) FROM public.companies WHERE status = 'blocked' OR status = 'suspended'),
    'stores_total',       (SELECT count(*) FROM public.stores),
    'branches_total',     (SELECT count(*) FROM public.branches),
    'users_total',        (SELECT count(*) FROM public.profiles),
    'customers_total',    (SELECT count(*) FROM public.customers),
    'subscriptions_total',(SELECT count(*) FROM public.subscriptions),
    'subscriptions_active',(SELECT count(*) FROM public.subscriptions WHERE status = 'active'),
    'trials_active',      (SELECT count(*) FROM public.subscriptions WHERE status = 'trial'),
    'trials_expired',     (SELECT count(*) FROM public.subscriptions WHERE status = 'expired'),
    'revenue_month',      COALESCE((SELECT sum(amount) FROM public.payment_transactions
                                    WHERE status = 'completed'
                                      AND created_at >= date_trunc('month', now())), 0),
    'revenue_total',      COALESCE((SELECT sum(amount) FROM public.payment_transactions
                                    WHERE status = 'completed'), 0)
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.founder_global_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT ((SELECT is_founder FROM public.profiles WHERE id = auth.uid()) = true) THEN
    RAISE EXCEPTION 'Founder access required';
  END IF;

  WITH rev AS (
    SELECT
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) AS total,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid' AND paid_at >= date_trunc('month', now())), 0) AS mes,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid' AND paid_at >= date_trunc('day', now())), 0) AS dia,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid' AND paid_at >= now() - interval '30 days'), 0) AS mrr,
      COALESCE(COUNT(*) FILTER (WHERE status = 'paid'), 0) AS paid_count,
      COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0) AS pending_count,
      COALESCE(COUNT(*), 0) AS total_count,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'pending'), 0) AS pending_amount
    FROM public.invoices
  ),
  comp AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE subscription_status = 'active') AS ativas,
      COUNT(*) FILTER (WHERE subscription_status = 'trial') AS trial,
      COUNT(*) FILTER (WHERE subscription_status = 'suspended') AS suspensas,
      COUNT(*) FILTER (WHERE subscription_status = 'cancelled') AS canceladas,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS novas
    FROM public.companies
  ),
  usr AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE last_login >= now() - interval '30 days') AS ativos,
      COUNT(*) FILTER (WHERE last_login >= now() - interval '5 minutes') AS online,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS novos
    FROM public.profiles
  ),
  crm AS (
    SELECT
      COUNT(*) AS leads_total,
      COUNT(*) FILTER (WHERE status = 'converted' OR status = 'convertido') AS convertidos,
      COUNT(*) FILTER (WHERE status = 'perdido') AS perdidos,
      COALESCE(SUM(value_estimated) FILTER (WHERE status NOT IN ('perdido','converted','convertido')), 0) AS pipeline_global
    FROM public.leads
  ),
  top_companies AS (
    SELECT jsonb_agg(row_to_json(t)) AS list FROM (
      SELECT c.name, COALESCE(SUM(i.total_amount),0) AS receita
      FROM public.companies c
      LEFT JOIN public.invoices i ON i.company_id = c.id AND i.status = 'paid'
      GROUP BY c.name
      ORDER BY receita DESC NULLS LAST
      LIMIT 10
    ) t
  ),
  rev_by_plan AS (
    SELECT jsonb_object_agg(COALESCE(plan_tier,'sem_plano'), receita) AS map FROM (
      SELECT plan_tier, COALESCE(SUM(total_amount),0) AS receita
      FROM public.invoices WHERE status = 'paid' GROUP BY plan_tier
    ) t
  )
  SELECT jsonb_build_object(
    'receita', jsonb_build_object(
      'total', rev.total, 'mes', rev.mes, 'dia', rev.dia,
      'mrr', rev.mrr, 'arr', rev.mrr * 12
    ),
    'empresas', jsonb_build_object(
      'total', comp.total, 'ativas', comp.ativas, 'trial', comp.trial,
      'suspensas', comp.suspensas, 'canceladas', comp.canceladas, 'novas', comp.novas
    ),
    'utilizadores', jsonb_build_object(
      'total', usr.total, 'ativos', usr.ativos, 'online', usr.online, 'novos', usr.novos
    ),
    'crm', jsonb_build_object(
      'leads_total', crm.leads_total, 'convertidos', crm.convertidos,
      'perdidos', crm.perdidos, 'pipeline_global', crm.pipeline_global,
      'taxa_conversao', CASE WHEN crm.leads_total > 0 THEN ROUND((crm.convertidos::numeric / crm.leads_total)*100, 2) ELSE 0 END
    ),
    'financeiro', jsonb_build_object(
      'faturas_emitidas', rev.total_count,
      'faturas_pagas', rev.paid_count,
      'faturas_pendentes', rev.pending_count,
      'pendente_valor', rev.pending_amount,
      'receita_por_plano', COALESCE(rp.map, '{}'::jsonb)
    ),
    'top_empresas', COALESCE(tc.list, '[]'::jsonb)
  ) INTO v_result
  FROM rev, comp, usr, crm, top_companies tc, rev_by_plan rp;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.founder_business_analytics(p_months integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    WHERE subscription_status = 'cancelled' AND updated_at >= (SELECT MIN(m) FROM months)
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
$function$;
