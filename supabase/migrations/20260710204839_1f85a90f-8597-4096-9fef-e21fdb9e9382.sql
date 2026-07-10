
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS value_estimated numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS probability int DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS expected_close_at date,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_reason text;

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('call','email','whatsapp','meeting','note','status_change','stage_change','conversion')),
  content text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_company ON public.lead_activities(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members read lead activities"
ON public.lead_activities FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids())
  OR public.is_founder(auth.uid())
);

CREATE POLICY "Company members insert lead activities"
ON public.lead_activities FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids())
  OR public.is_founder(auth.uid())
);

CREATE POLICY "Founders manage lead activities"
ON public.lead_activities FOR ALL TO authenticated
USING (public.is_founder(auth.uid()))
WITH CHECK (public.is_founder(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_activities(lead_id, company_id, activity_type, content, created_by)
    VALUES (NEW.id, NEW.company_id, 'status_change',
            format('Estado alterado: %s → %s', OLD.status, NEW.status), auth.uid());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_lead_status ON public.leads;
CREATE TRIGGER trg_log_lead_status
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_status_change();

CREATE OR REPLACE FUNCTION public.convert_lead_to_customer(p_lead_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_customer_id uuid;
  v_authorized boolean;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;

  SELECT (v_lead.company_id IN (SELECT public.get_user_company_ids()))
         OR public.is_founder(auth.uid())
    INTO v_authorized;
  IF NOT v_authorized THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO public.customers(full_name, phone, email, notes, created_by)
  VALUES (
    COALESCE(v_lead.business_name, v_lead.name),
    v_lead.phone, v_lead.email,
    COALESCE(v_lead.notes, '') || E'\n[Convertido de lead ' || p_lead_id::text || ']',
    auth.uid()
  )
  RETURNING id INTO v_customer_id;

  UPDATE public.leads
     SET status='converted', converted_at=now(), probability=100
   WHERE id = p_lead_id;

  INSERT INTO public.lead_activities(lead_id, company_id, activity_type, content, metadata, created_by)
  VALUES (p_lead_id, v_lead.company_id, 'conversion',
          'Lead convertido em cliente',
          jsonb_build_object('customer_id', v_customer_id), auth.uid());

  RETURN v_customer_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.convert_lead_to_customer(uuid) TO authenticated;
