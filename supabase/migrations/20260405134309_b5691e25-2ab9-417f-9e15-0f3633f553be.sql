
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, module)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "CEO and Admin can manage permissions"
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "CEO and Admin can update permissions"
  ON public.role_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "CEO and Admin can delete permissions"
  ON public.role_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('ceo', 'dashboard', true, true, true, true),
('ceo', 'pos', true, true, true, true),
('ceo', 'products', true, true, true, true),
('ceo', 'inventory', true, true, true, true),
('ceo', 'sales', true, true, true, true),
('ceo', 'finance', true, true, true, true),
('ceo', 'hr', true, true, true, true),
('ceo', 'accounting', true, true, true, true),
('ceo', 'reports', true, true, true, true),
('ceo', 'settings', true, true, true, true),
('ceo', 'users', true, true, true, true),
('ceo', 'crm', true, true, true, true),
('ceo', 'suppliers', true, true, true, true),
('ceo', 'fiscal', true, true, true, true),
('director', 'dashboard', true, false, false, false),
('director', 'pos', true, false, false, false),
('director', 'products', true, false, false, false),
('director', 'inventory', true, false, false, false),
('director', 'sales', true, false, false, false),
('director', 'finance', true, false, true, false),
('director', 'hr', true, false, false, false),
('director', 'accounting', true, false, false, false),
('director', 'reports', true, true, true, false),
('director', 'crm', true, false, false, false),
('director', 'suppliers', true, false, false, false),
('director', 'fiscal', true, false, false, false),
('admin', 'dashboard', true, true, true, true),
('admin', 'pos', true, true, true, true),
('admin', 'products', true, true, true, true),
('admin', 'inventory', true, true, true, true),
('admin', 'sales', true, true, true, true),
('admin', 'finance', true, true, true, true),
('admin', 'hr', true, true, true, true),
('admin', 'accounting', true, true, true, true),
('admin', 'reports', true, true, true, true),
('admin', 'settings', true, true, true, true),
('admin', 'users', true, true, true, true),
('admin', 'crm', true, true, true, true),
('admin', 'suppliers', true, true, true, true),
('admin', 'fiscal', true, true, true, true),
('manager', 'dashboard', true, false, false, false),
('manager', 'pos', true, true, true, false),
('manager', 'products', true, true, true, false),
('manager', 'inventory', true, true, true, false),
('manager', 'sales', true, true, true, false),
('manager', 'reports', true, true, false, false),
('manager', 'crm', true, true, true, false),
('hr', 'dashboard', true, false, false, false),
('hr', 'hr', true, true, true, false),
('hr', 'reports', true, false, false, false),
('cashier', 'pos', true, true, true, false),
('cashier', 'sales', true, true, false, false),
('cashier', 'products', true, false, false, false),
('seller', 'pos', true, true, false, false),
('seller', 'sales', true, true, false, false),
('seller', 'crm', true, true, true, false),
('seller', 'products', true, false, false, false),
('reseller', 'dashboard', true, false, false, false),
('reseller', 'sales', true, true, false, false),
('reseller', 'crm', true, true, false, false);
