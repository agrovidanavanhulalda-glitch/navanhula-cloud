
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to UUID,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','cancelled')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  task_type TEXT NOT NULL DEFAULT 'manual',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT ALL ON public.crm_tasks TO service_role;

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_tasks_company_members"
ON public.crm_tasks FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids())
  OR public.is_founder(auth.uid())
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids())
  OR public.is_founder(auth.uid())
);

CREATE INDEX idx_crm_tasks_company ON public.crm_tasks(company_id);
CREATE INDEX idx_crm_tasks_lead ON public.crm_tasks(lead_id);
CREATE INDEX idx_crm_tasks_assigned ON public.crm_tasks(assigned_to, status);
CREATE INDEX idx_crm_tasks_due ON public.crm_tasks(due_date) WHERE status = 'pending';

CREATE TRIGGER trg_crm_tasks_updated_at
BEFORE UPDATE ON public.crm_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_lead_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_recipient UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_recipient := COALESCE(NEW.assigned_to, NEW.created_by);
    INSERT INTO public.audit_logs (user_id, company_id, action, entity_type, entity_id, old_data, new_data, metadata)
    VALUES (auth.uid(), NEW.company_id, 'lead_status_change', 'lead', NEW.id,
      jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status),
      jsonb_build_object('lead_name', NEW.name));
    IF v_recipient IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, company_id, type, category, title, message, link, created_by)
      VALUES (v_recipient, NEW.company_id, 'info', 'crm',
        'Lead atualizado: ' || NEW.name,
        'Estado alterado de ' || OLD.status || ' para ' || NEW.status,
        '/app/leads', auth.uid());
    END IF;
    IF NEW.status = 'converted' AND OLD.status <> 'converted' THEN
      INSERT INTO public.crm_tasks (company_id, lead_id, assigned_to, title, description, priority, task_type, due_date, created_by)
      VALUES (NEW.company_id, NEW.id, v_recipient,
        'Onboarding do novo cliente: ' || NEW.name,
        'Lead convertido. Agendar reunião de onboarding e enviar boas-vindas.',
        'high', 'auto_conversion', now() + interval '2 days', auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_lead_status ON public.leads;
CREATE TRIGGER trg_notify_lead_status AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_lead_status_change();

CREATE OR REPLACE FUNCTION public.process_lead_followups()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_lead RECORD; v_days INT; v_created INT := 0; v_recipient UUID;
BEGIN
  FOR v_lead IN
    SELECT l.* FROM public.leads l
    WHERE l.status NOT IN ('converted','lost')
      AND COALESCE(l.last_contact_at, l.created_at) < now() - interval '3 days'
  LOOP
    v_days := EXTRACT(DAY FROM now() - COALESCE(v_lead.last_contact_at, v_lead.created_at))::INT;
    IF EXISTS (SELECT 1 FROM public.crm_tasks WHERE lead_id = v_lead.id AND task_type = 'auto_followup'
      AND status = 'pending' AND created_at > now() - interval '3 days') THEN CONTINUE; END IF;
    IF v_days NOT IN (3, 7, 14, 30) THEN CONTINUE; END IF;
    v_recipient := COALESCE(v_lead.assigned_to, v_lead.created_by);
    INSERT INTO public.crm_tasks (company_id, lead_id, assigned_to, title, description, priority, task_type, due_date, metadata)
    VALUES (v_lead.company_id, v_lead.id, v_recipient,
      'Follow-up: ' || v_lead.name || ' (' || v_days || ' dias sem contacto)',
      'Lead sem interação há ' || v_days || ' dias. Contactar hoje.',
      CASE WHEN v_days >= 14 THEN 'high' WHEN v_days >= 7 THEN 'medium' ELSE 'low' END,
      'auto_followup', now() + interval '1 day',
      jsonb_build_object('days_inactive', v_days));
    IF v_recipient IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, company_id, type, category, title, message, link)
      VALUES (v_recipient, v_lead.company_id, 'warning', 'crm',
        'Lead parado: ' || v_lead.name,
        v_days || ' dias sem contacto. Nova tarefa de follow-up criada.',
        '/app/leads');
    END IF;
    v_created := v_created + 1;
  END LOOP;
  RETURN jsonb_build_object('tasks_created', v_created, 'processed_at', now());
END; $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'navanhula-lead-followups') THEN
      PERFORM cron.unschedule('navanhula-lead-followups');
    END IF;
    PERFORM cron.schedule('navanhula-lead-followups', '0 8 * * *', 'SELECT public.process_lead_followups();');
  END IF;
END $$;
