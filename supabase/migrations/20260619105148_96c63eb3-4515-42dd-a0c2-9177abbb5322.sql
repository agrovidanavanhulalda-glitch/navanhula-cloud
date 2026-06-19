
CREATE TABLE IF NOT EXISTS public.approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  entity_type text NOT NULL,
  min_amount numeric DEFAULT 0,
  max_amount numeric,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_workflows TO authenticated;
GRANT ALL ON public.approval_workflows TO service_role;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_workflows_select" ON public.approval_workflows FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "approval_workflows_admin_write" ON public.approval_workflows FOR ALL TO authenticated
  USING (company_id IN (SELECT get_user_company_ids()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()));

CREATE TABLE IF NOT EXISTS public.approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  approver_role text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_steps TO authenticated;
GRANT ALL ON public.approval_steps TO service_role;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_steps_select" ON public.approval_steps FOR SELECT TO authenticated
  USING (workflow_id IN (SELECT id FROM public.approval_workflows WHERE company_id IN (SELECT get_user_company_ids())));
CREATE POLICY "approval_steps_admin_write" ON public.approval_steps FOR ALL TO authenticated
  USING (workflow_id IN (SELECT id FROM public.approval_workflows WHERE company_id IN (SELECT get_user_company_ids()))
    AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)));

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.approval_workflows(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  amount numeric DEFAULT 0,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  current_step int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_requests_select" ON public.approval_requests FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "approval_requests_insert" ON public.approval_requests FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND requested_by = auth.uid());
CREATE POLICY "approval_requests_update" ON public.approval_requests FOR UPDATE TO authenticated
  USING (company_id IN (SELECT get_user_company_ids()));

CREATE TABLE IF NOT EXISTS public.approval_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.approval_actions TO authenticated;
GRANT ALL ON public.approval_actions TO service_role;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_actions_select" ON public.approval_actions FOR SELECT TO authenticated
  USING (request_id IN (SELECT id FROM public.approval_requests WHERE company_id IN (SELECT get_user_company_ids())));
CREATE POLICY "approval_actions_insert" ON public.approval_actions FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.sod_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  conflicting_permissions text[] NOT NULL,
  severity text NOT NULL DEFAULT 'high',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sod_rules TO authenticated;
GRANT ALL ON public.sod_rules TO service_role;
ALTER TABLE public.sod_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sod_rules_select" ON public.sod_rules FOR SELECT TO authenticated
  USING (company_id IS NULL OR company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "sod_rules_admin_write" ON public.sod_rules FOR ALL TO authenticated
  USING ((company_id IS NULL OR company_id IN (SELECT get_user_company_ids()))
    AND has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.sod_rules (company_id, name, description, conflicting_permissions, severity) VALUES
  (NULL,'RH não pode aprovar próprio salário','Quem cria folha não pode aprová-la',ARRAY['hr.payroll.create','hr.payroll.approve'],'critical'),
  (NULL,'Caixa não pode fechar próprio caixa','Quem opera o caixa não pode fechar a sessão',ARRAY['cash.operate','cash.close'],'high'),
  (NULL,'Contabilidade não pode alterar lançamento aprovado','Lançamentos aprovados são imutáveis',ARRAY['accounting.entry.create','accounting.entry.edit_approved'],'critical')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sod_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.sod_rules(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  details jsonb,
  resolved boolean NOT NULL DEFAULT false,
  detected_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sod_violations TO authenticated;
GRANT ALL ON public.sod_violations TO service_role;
ALTER TABLE public.sod_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sod_violations_admin_select" ON public.sod_violations FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_user_company_ids()) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'ceo'::app_role)));

CREATE TABLE IF NOT EXISTS public.delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'approval',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delegations TO authenticated;
GRANT ALL ON public.delegations TO service_role;
ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delegations_select" ON public.delegations FOR SELECT TO authenticated
  USING (company_id IN (SELECT get_user_company_ids()) AND (from_user_id = auth.uid() OR to_user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "delegations_insert" ON public.delegations FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT get_user_company_ids()) AND (from_user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "delegations_update" ON public.delegations FOR UPDATE TO authenticated
  USING (company_id IN (SELECT get_user_company_ids()) AND (from_user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role)));

CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  read_only boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.impersonation_sessions TO authenticated;
GRANT ALL ON public.impersonation_sessions TO service_role;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "impersonation_ceo_only" ON public.impersonation_sessions FOR ALL TO authenticated
  USING (actor_id = auth.uid() AND has_role(auth.uid(),'ceo'::app_role))
  WITH CHECK (actor_id = auth.uid() AND has_role(auth.uid(),'ceo'::app_role) AND read_only = true);

CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _old jsonb DEFAULT NULL,
  _new jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _company uuid;
BEGIN
  SELECT company_id INTO _company FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(user_id, company_id, action, entity_type, entity_id, old_data, new_data, metadata)
  VALUES (auth.uid(), _company, _action, _entity_type, _entity_id, _old, _new, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text,text,uuid,jsonb,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_sod_for_user(_user_id uuid)
RETURNS TABLE(rule_id uuid, rule_name text, conflicting_permissions text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH user_perms AS (
    SELECT DISTINCT p.key AS permission_key
    FROM public.user_roles ur
    JOIN public.roles r ON r.key = ur.role::text
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
    UNION
    SELECT p.key
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id AND up.granted = true
  )
  SELECT sr.id, sr.name, sr.conflicting_permissions
  FROM public.sod_rules sr
  WHERE sr.is_active = true
    AND (SELECT count(*) FROM unnest(sr.conflicting_permissions) c
         WHERE c IN (SELECT permission_key FROM user_perms)) = array_length(sr.conflicting_permissions,1);
$$;
GRANT EXECUTE ON FUNCTION public.check_sod_for_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_governance_dashboard()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _company uuid; _result jsonb;
BEGIN
  SELECT company_id INTO _company FROM public.profiles WHERE id = auth.uid();
  SELECT jsonb_build_object(
    'active_users', (SELECT count(DISTINCT user_id) FROM public.user_sessions WHERE is_active = true AND company_id = _company),
    'pending_approvals', (SELECT count(*) FROM public.approval_requests WHERE status='pending' AND company_id = _company),
    'critical_changes_7d', (SELECT count(*) FROM public.audit_logs WHERE company_id = _company AND created_at > now() - interval '7 days' AND action IN ('price.update','permission.change','user.delete','sale.cancel')),
    'security_events_24h', (SELECT count(*) FROM public.audit_logs WHERE company_id = _company AND created_at > now() - interval '24 hours' AND action LIKE 'auth.%'),
    'sod_violations', (SELECT count(*) FROM public.sod_violations WHERE company_id = _company AND resolved = false)
  ) INTO _result;
  RETURN _result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_governance_dashboard() TO authenticated;
