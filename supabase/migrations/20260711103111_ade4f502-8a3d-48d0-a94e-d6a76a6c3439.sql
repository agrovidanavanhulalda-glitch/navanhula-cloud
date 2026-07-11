
-- Commercial dashboard stats per company
CREATE OR REPLACE FUNCTION public.commercial_dashboard_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Access check: founder OR belongs to company
  IF NOT (
    (SELECT is_founder FROM public.profiles WHERE id = auth.uid()) = true
    OR p_company_id = ANY(public.get_user_company_ids(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH lead_stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'novo') AS novos,
      COUNT(*) FILTER (WHERE status IN ('contatado','qualificado','proposta','negociacao')) AS ativos,
      COUNT(*) FILTER (WHERE status = 'perdido') AS perdidos,
      COUNT(*) FILTER (WHERE status = 'converted' OR status = 'convertido') AS convertidos,
      COALESCE(SUM(value_estimated) FILTER (WHERE status NOT IN ('perdido','converted','convertido')), 0) AS pipeline_total,
      COALESCE(SUM(value_estimated * COALESCE(probability,0) / 100.0) FILTER (WHERE status NOT IN ('perdido','converted','convertido')), 0) AS pipeline_ponderado,
      COALESCE(SUM(value_estimated) FILTER (WHERE status = 'converted' OR status = 'convertido'), 0) AS receita_realizada,
      COALESCE(AVG(value_estimated) FILTER (WHERE value_estimated IS NOT NULL), 0) AS ticket_medio,
      COALESCE(AVG(EXTRACT(EPOCH FROM (converted_at - created_at))/86400.0) FILTER (WHERE converted_at IS NOT NULL), 0) AS tempo_medio_dias
    FROM public.leads
    WHERE company_id = p_company_id
  ),
  top_sellers AS (
    SELECT jsonb_agg(row_to_json(t)) AS list FROM (
      SELECT p.full_name AS name, COUNT(l.id) AS conversoes, COALESCE(SUM(l.value_estimated),0) AS valor
      FROM public.leads l
      LEFT JOIN public.profiles p ON p.id = l.assigned_to
      WHERE l.company_id = p_company_id AND (l.status = 'converted' OR l.status = 'convertido')
      GROUP BY p.full_name
      ORDER BY valor DESC
      LIMIT 10
    ) t
  ),
  activity_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE type = 'call') AS chamadas,
      COUNT(*) FILTER (WHERE type = 'meeting') AS reunioes,
      COUNT(*) FILTER (WHERE type = 'email') AS emails,
      COUNT(*) FILTER (WHERE type = 'whatsapp') AS whatsapp,
      COUNT(*) FILTER (WHERE type = 'note') AS notas
    FROM public.lead_activities la
    WHERE la.lead_id IN (SELECT id FROM public.leads WHERE company_id = p_company_id)
  )
  SELECT jsonb_build_object(
    'leads', jsonb_build_object(
      'total', ls.total, 'novos', ls.novos, 'ativos', ls.ativos,
      'perdidos', ls.perdidos, 'convertidos', ls.convertidos
    ),
    'pipeline', jsonb_build_object(
      'total', ls.pipeline_total, 'ponderado', ls.pipeline_ponderado,
      'receita_realizada', ls.receita_realizada
    ),
    'conversao', jsonb_build_object(
      'taxa', CASE WHEN ls.total > 0 THEN ROUND((ls.convertidos::numeric / ls.total) * 100, 2) ELSE 0 END,
      'tempo_medio_dias', ROUND(ls.tempo_medio_dias::numeric, 1),
      'ticket_medio', ROUND(ls.ticket_medio::numeric, 2)
    ),
    'top_sellers', COALESCE(ts.list, '[]'::jsonb),
    'atividades', jsonb_build_object(
      'chamadas', a.chamadas, 'reunioes', a.reunioes,
      'emails', a.emails, 'whatsapp', a.whatsapp, 'notas', a.notas
    )
  ) INTO v_result
  FROM lead_stats ls, top_sellers ts, activity_stats a;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.commercial_dashboard_stats(uuid) TO authenticated;

-- Founder global dashboard stats
CREATE OR REPLACE FUNCTION public.founder_global_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
      COUNT(*) FILTER (WHERE subscription_status = 'canceled') AS canceladas,
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
$$;

GRANT EXECUTE ON FUNCTION public.founder_global_dashboard_stats() TO authenticated;
