
-- 1. Branches (filiais)
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  manager_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select" ON public.branches FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "branches_insert" ON public.branches FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo')));

CREATE POLICY "branches_update" ON public.branches FOR UPDATE TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo')));

CREATE POLICY "branches_delete" ON public.branches FOR DELETE TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids())
    AND public.has_role(auth.uid(), 'ceo'));

CREATE INDEX idx_branches_company ON public.branches(company_id);

-- 2. Add branch_id to company_users
ALTER TABLE public.company_users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- 3. Add branch_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- 4. Add can_approve to role_permissions
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS can_approve BOOLEAN DEFAULT false;

-- Update existing role_permissions: CEO and admin get approve rights
UPDATE public.role_permissions SET can_approve = true WHERE role IN ('ceo', 'admin');

-- 5. User sessions tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_own" ON public.user_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sessions_admin_select" ON public.user_sessions FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo'))
    AND user_id IN (
      SELECT cu.user_id FROM public.company_users cu
      WHERE cu.company_id IN (SELECT public.get_user_company_ids())
    )
  );

CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;

-- 6. Function to get user branch IDs
CREATE OR REPLACE FUNCTION public.get_user_branch_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT branch_id FROM public.company_users
  WHERE user_id = auth.uid() AND status = 'active' AND branch_id IS NOT NULL
  UNION
  SELECT branch_id FROM public.profiles
  WHERE id = auth.uid() AND branch_id IS NOT NULL
$$;

-- 7. Function to terminate session
CREATE OR REPLACE FUNCTION public.terminate_user_session(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ceo')) THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissão');
  END IF;

  SELECT * INTO v_session FROM public.user_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Sessão não encontrada');
  END IF;

  UPDATE public.user_sessions
  SET is_active = false, ended_at = now()
  WHERE id = p_session_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'TERMINATE_SESSION', 'user_sessions', p_session_id::text,
    jsonb_build_object('target_user', v_session.user_id, 'ip', v_session.ip_address));

  RETURN json_build_object('success', true, 'message', 'Sessão encerrada');
END;
$$;

-- 8. Function to record session on login
CREATE OR REPLACE FUNCTION public.record_user_session(p_ip text DEFAULT NULL, p_user_agent text DEFAULT NULL, p_device text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  INSERT INTO public.user_sessions (user_id, ip_address, user_agent, device_type)
  VALUES (auth.uid(), p_ip, p_user_agent, p_device)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- 9. Add approve to invitation link
ALTER TABLE public.company_invitations ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- 10. Updated_at trigger for branches
CREATE TRIGGER update_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
