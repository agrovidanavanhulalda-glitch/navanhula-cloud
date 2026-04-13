
-- 1. Company invitations table
CREATE TABLE IF NOT EXISTS public.company_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  role TEXT NOT NULL DEFAULT 'seller',
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations for their companies
CREATE POLICY "Company admins manage invitations"
ON public.company_invitations
FOR ALL
TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids()))
WITH CHECK (company_id IN (SELECT public.get_user_company_ids()));

-- Allow anon/public to read active invitations by token (for invite acceptance)
CREATE POLICY "Anyone can read active invite by token"
ON public.company_invitations
FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- Index for fast token lookup
CREATE INDEX idx_company_invitations_token ON public.company_invitations(token);
CREATE INDEX idx_company_invitations_company ON public.company_invitations(company_id);

-- Trigger for updated_at
CREATE TRIGGER update_company_invitations_updated_at
BEFORE UPDATE ON public.company_invitations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed role_permissions with defaults (idempotent)
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
VALUES
  -- CEO: full access
  ('ceo', 'stock', true, true, true, true),
  ('ceo', 'sales', true, true, true, true),
  ('ceo', 'finance', true, true, true, true),
  ('ceo', 'users', true, true, true, true),
  ('ceo', 'reports', true, true, true, true),
  ('ceo', 'settings', true, true, true, true),
  ('ceo', 'compliance', true, true, true, true),
  ('ceo', 'hr', true, true, true, true),
  -- Admin: full access
  ('admin', 'stock', true, true, true, true),
  ('admin', 'sales', true, true, true, true),
  ('admin', 'finance', true, true, true, true),
  ('admin', 'users', true, true, true, true),
  ('admin', 'reports', true, true, true, true),
  ('admin', 'settings', true, true, true, true),
  ('admin', 'compliance', true, true, true, true),
  ('admin', 'hr', true, true, true, true),
  -- Manager: operational
  ('manager', 'stock', true, true, true, false),
  ('manager', 'sales', true, true, true, false),
  ('manager', 'finance', true, true, false, false),
  ('manager', 'users', true, false, false, false),
  ('manager', 'reports', true, true, false, false),
  ('manager', 'settings', true, false, false, false),
  ('manager', 'compliance', true, false, false, false),
  ('manager', 'hr', true, true, true, false),
  -- Seller: sales only
  ('seller', 'stock', true, false, false, false),
  ('seller', 'sales', true, true, false, false),
  ('seller', 'finance', false, false, false, false),
  ('seller', 'users', false, false, false, false),
  ('seller', 'reports', true, false, false, false),
  ('seller', 'settings', false, false, false, false),
  ('seller', 'compliance', false, false, false, false),
  ('seller', 'hr', false, false, false, false),
  -- Cashier: POS
  ('cashier', 'stock', true, false, false, false),
  ('cashier', 'sales', true, true, false, false),
  ('cashier', 'finance', false, false, false, false),
  ('cashier', 'users', false, false, false, false),
  ('cashier', 'reports', false, false, false, false),
  ('cashier', 'settings', false, false, false, false),
  ('cashier', 'compliance', false, false, false, false),
  ('cashier', 'hr', false, false, false, false)
ON CONFLICT DO NOTHING;

-- 3. Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_company_invitation(p_token TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Não autenticado');
  END IF;

  SELECT * INTO v_invite FROM company_invitations
  WHERE token = p_token AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Convite inválido ou expirado');
  END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE company_invitations SET status = 'expired' WHERE id = v_invite.id;
    RETURN json_build_object('success', false, 'message', 'Convite expirado');
  END IF;

  IF v_invite.used_count >= v_invite.max_uses THEN
    UPDATE company_invitations SET status = 'expired' WHERE id = v_invite.id;
    RETURN json_build_object('success', false, 'message', 'Convite esgotado');
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM company_users WHERE user_id = v_user_id AND company_id = v_invite.company_id) THEN
    RETURN json_build_object('success', false, 'message', 'Já é membro desta empresa');
  END IF;

  -- Add user to company
  INSERT INTO company_users (user_id, company_id, role, status)
  VALUES (v_user_id, v_invite.company_id, v_invite.role, 'active');

  -- Update profile company_id if not set
  UPDATE profiles SET company_id = v_invite.company_id WHERE id = v_user_id AND company_id IS NULL;

  -- Update user role
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, v_invite.role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Increment usage
  UPDATE company_invitations
  SET used_count = used_count + 1,
      status = CASE WHEN used_count + 1 >= max_uses THEN 'expired' ELSE 'active' END
  WHERE id = v_invite.id;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (v_user_id, 'INVITE_ACCEPTED', 'company_invitations', v_invite.id::text,
    jsonb_build_object('company_id', v_invite.company_id, 'role', v_invite.role, 'token', p_token));

  RETURN json_build_object('success', true, 'company_id', v_invite.company_id, 'role', v_invite.role);
END;
$$;

-- 4. Function to update company user role  
CREATE OR REPLACE FUNCTION public.update_company_user_role(p_user_id UUID, p_company_id UUID, p_new_role TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  
  -- Check caller is admin/owner of this company
  IF NOT EXISTS (
    SELECT 1 FROM company_users 
    WHERE user_id = v_caller_id AND company_id = p_company_id 
    AND role IN ('owner', 'admin') AND status = 'active'
  ) AND NOT has_role(v_caller_id, 'ceo') THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissão');
  END IF;

  UPDATE company_users SET role = p_new_role, updated_at = now()
  WHERE user_id = p_user_id AND company_id = p_company_id;

  -- Update user_roles too
  DELETE FROM user_roles WHERE user_id = p_user_id;
  INSERT INTO user_roles (user_id, role) VALUES (p_user_id, p_new_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Audit
  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (v_caller_id, 'ROLE_CHANGED', 'company_users', p_user_id::text,
    jsonb_build_object('company_id', p_company_id, 'new_role', p_new_role, 'changed_by', v_caller_id));

  RETURN json_build_object('success', true);
END;
$$;

-- 5. Function to block/unblock user
CREATE OR REPLACE FUNCTION public.toggle_company_user_status(p_user_id UUID, p_company_id UUID, p_status TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM company_users 
    WHERE user_id = v_caller_id AND company_id = p_company_id 
    AND role IN ('owner', 'admin') AND status = 'active'
  ) AND NOT has_role(v_caller_id, 'ceo') THEN
    RETURN json_build_object('success', false, 'message', 'Sem permissão');
  END IF;

  -- Cannot block yourself
  IF p_user_id = v_caller_id THEN
    RETURN json_build_object('success', false, 'message', 'Não pode bloquear a si próprio');
  END IF;

  UPDATE company_users SET status = p_status, updated_at = now()
  WHERE user_id = p_user_id AND company_id = p_company_id;

  -- Audit
  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (v_caller_id, 'USER_STATUS_CHANGED', 'company_users', p_user_id::text,
    jsonb_build_object('company_id', p_company_id, 'new_status', p_status));

  RETURN json_build_object('success', true);
END;
$$;
