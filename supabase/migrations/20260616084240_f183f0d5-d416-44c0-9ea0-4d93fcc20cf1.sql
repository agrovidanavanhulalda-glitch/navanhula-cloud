
-- =====================================================================
-- Phase 1 (clean): Org structure + RBAC engine, idempotent and additive
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE public.permission_scope AS ENUM ('GLOBAL','COMPANY','BRANCH','DEPARTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============= TENANTS =============
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenants_owner_read ON public.tenants;
CREATE POLICY tenants_owner_read ON public.tenants FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_master_owner(auth.uid()));
DROP POLICY IF EXISTS tenants_owner_manage ON public.tenants;
CREATE POLICY tenants_owner_manage ON public.tenants FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_master_owner(auth.uid()))
  WITH CHECK (owner_user_id = auth.uid() OR public.is_master_owner(auth.uid()));

-- ============= DEPARTMENTS =============
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  parent_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_departments_company ON public.departments(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS departments_select ON public.departments;
CREATE POLICY departments_select ON public.departments FOR SELECT TO authenticated
  USING (company_id = public.current_company_id() OR public.is_master_owner(auth.uid()));
DROP POLICY IF EXISTS departments_manage ON public.departments;
CREATE POLICY departments_manage ON public.departments FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.is_admin_or_manager())
  WITH CHECK (company_id = public.current_company_id() AND public.is_admin_or_manager());

-- ============= TEAMS =============
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  lead_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teams_department ON public.teams(department_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.departments d
                 WHERE d.id = teams.department_id
                   AND (d.company_id = public.current_company_id() OR public.is_master_owner(auth.uid()))));
DROP POLICY IF EXISTS teams_manage ON public.teams;
CREATE POLICY teams_manage ON public.teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.departments d
                 WHERE d.id = teams.department_id
                   AND d.company_id = public.current_company_id()
                   AND public.is_admin_or_manager()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.departments d
                 WHERE d.id = teams.department_id
                   AND d.company_id = public.current_company_id()
                   AND public.is_admin_or_manager()));

-- ============= Additive columns =============
ALTER TABLE public.companies   ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON public.companies(tenant_id);

ALTER TABLE public.roles       ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;
ALTER TABLE public.roles       ADD COLUMN IF NOT EXISTS level int NOT NULL DEFAULT 0;
ALTER TABLE public.roles       ADD COLUMN IF NOT EXISTS scope_default text NOT NULL DEFAULT 'COMPANY';
ALTER TABLE public.roles       ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS module text;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS action text;

ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'COMPANY';

ALTER TABLE public.user_roles  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.user_roles  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.user_roles  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'COMPANY';

-- ============= USER_PERMISSIONS (overrides) =============
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  scope public.permission_scope NOT NULL DEFAULT 'COMPANY',
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_perm_user ON public.user_permissions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_perm_self_read ON public.user_permissions;
CREATE POLICY user_perm_self_read ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR public.has_role(auth.uid(),'admin')
         OR public.has_role(auth.uid(),'ceo'));
DROP POLICY IF EXISTS user_perm_admin_manage ON public.user_permissions;
CREATE POLICY user_perm_admin_manage ON public.user_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ceo'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ceo'));

-- ============= updated_at triggers =============
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_departments_updated_at ON public.departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- Update existing roles (preserve names + keys), tag as system + metadata
-- =====================================================================
UPDATE public.roles SET is_system=true, level=100, scope_default='GLOBAL', description=coalesce(description,'Acesso total')      WHERE key='admin';
UPDATE public.roles SET is_system=true, level=90,  scope_default='COMPANY', description=coalesce(description,'CEO da empresa')   WHERE key='ceo';
UPDATE public.roles SET is_system=true, level=80,  scope_default='COMPANY', description=coalesce(description,'Diretor')          WHERE key='director';
UPDATE public.roles SET is_system=true, level=50,  scope_default='BRANCH',  description=coalesce(description,'Gerente de filial')WHERE key='manager';
UPDATE public.roles SET is_system=true, level=30,  scope_default='COMPANY', description=coalesce(description,'Recursos humanos') WHERE key='hr';
UPDATE public.roles SET is_system=true, level=20,  scope_default='BRANCH',  description=coalesce(description,'Caixa')            WHERE key='cashier';
UPDATE public.roles SET is_system=true, level=20,  scope_default='BRANCH',  description=coalesce(description,'Vendedor')         WHERE key='seller';
UPDATE public.roles SET is_system=true, level=0,   scope_default='COMPANY', description=coalesce(description,'Visualizador')     WHERE key='viewer';
UPDATE public.roles SET is_system=true, level=10,  scope_default='COMPANY', description=coalesce(description,'Revendedor')       WHERE key='reseller';

-- Insert NEW system roles (only if key not present)
INSERT INTO public.roles (key, name, is_system, level, scope_default, description)
SELECT v.key, v.name, true, v.lvl, v.sc, v.descr
FROM (VALUES
  ('owner','Owner',100,'GLOBAL','Controle total da plataforma'),
  ('coo','COO',80,'COMPANY','Diretor de operações'),
  ('cfo','CFO',80,'COMPANY','Diretor financeiro'),
  ('chro','CHRO',80,'COMPANY','Diretor de RH'),
  ('cto','CTO',80,'COMPANY','Diretor de tecnologia'),
  ('admin_master','Admin Master',75,'COMPANY','Administrador master'),
  ('admin_rh','Admin RH',70,'COMPANY','Administrador de RH'),
  ('admin_contabilidade','Admin Contabilidade',70,'COMPANY','Administrador de contabilidade'),
  ('admin_comercial','Admin Comercial',70,'COMPANY','Administrador comercial'),
  ('supervisor','Supervisor',40,'DEPARTMENT','Supervisor de departamento'),
  ('contabilista','Contabilista',30,'COMPANY','Contabilista')
) AS v(key,name,lvl,sc,descr)
WHERE NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.key = v.key)
  AND NOT EXISTS (SELECT 1 FROM public.roles r WHERE r.name = v.name);

-- =====================================================================
-- Seed permissions
-- =====================================================================
INSERT INTO public.permissions (key, description, module, action)
SELECT k.key, k.descr, split_part(k.key,'.',1), split_part(k.key,'.',2)
FROM (VALUES
  ('users.view','Ver utilizadores'),
  ('users.create','Criar utilizadores'),
  ('users.edit','Editar utilizadores'),
  ('users.delete','Eliminar utilizadores'),
  ('sales.view','Ver vendas'),
  ('sales.create','Criar vendas'),
  ('sales.cancel','Cancelar vendas'),
  ('cash.open','Abrir caixa'),
  ('cash.close','Fechar caixa'),
  ('cash.view','Ver caixa'),
  ('finance.view','Ver finanças'),
  ('finance.approve','Aprovar movimentos financeiros'),
  ('finance.export','Exportar relatórios financeiros'),
  ('hr.payroll','Processar salários'),
  ('hr.attendance','Gerir assiduidade'),
  ('hr.view','Ver RH'),
  ('reports.view','Ver relatórios'),
  ('reports.export','Exportar relatórios'),
  ('settings.manage','Gerir configurações'),
  ('inventory.view','Ver inventário'),
  ('inventory.adjust','Ajustar inventário'),
  ('branches.manage','Gerir filiais'),
  ('roles.manage','Gerir cargos e permissões')
) AS k(key,descr)
ON CONFLICT (key) DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = COALESCE(public.permissions.description, EXCLUDED.description);

UPDATE public.permissions SET module = split_part(key,'.',1) WHERE module IS NULL;
UPDATE public.permissions SET action = split_part(key,'.',2) WHERE action IS NULL;

-- =====================================================================
-- Seed role_permissions
-- =====================================================================
-- owner + admin => all (GLOBAL / COMPANY)
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, CASE WHEN r.key='owner' THEN 'GLOBAL' ELSE 'COMPANY' END
FROM public.roles r CROSS JOIN public.permissions p
WHERE r.key IN ('owner','admin','admin_master','ceo')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- cfo / admin_contabilidade / contabilista => finance + reports
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'COMPANY' FROM public.roles r CROSS JOIN public.permissions p
WHERE r.key IN ('cfo','admin_contabilidade','contabilista')
  AND p.module IN ('finance','reports')
ON CONFLICT DO NOTHING;

-- chro / admin_rh / hr => hr
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'COMPANY' FROM public.roles r CROSS JOIN public.permissions p
WHERE r.key IN ('chro','admin_rh','hr') AND p.module='hr'
ON CONFLICT DO NOTHING;

-- admin_comercial => sales + inventory + reports
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'COMPANY' FROM public.roles r CROSS JOIN public.permissions p
WHERE r.key='admin_comercial' AND p.module IN ('sales','inventory','reports')
ON CONFLICT DO NOTHING;

-- manager (gerente) BRANCH
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'BRANCH' FROM public.roles r CROSS JOIN public.permissions p
WHERE r.key='manager' AND (p.module IN ('sales','cash','inventory','reports') OR p.key='users.view')
ON CONFLICT DO NOTHING;

-- supervisor DEPARTMENT
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'DEPARTMENT' FROM public.roles r CROSS JOIN public.permissions p
WHERE r.key='supervisor' AND p.key IN ('sales.view','cash.view','reports.view','inventory.view')
ON CONFLICT DO NOTHING;

-- seller / vendedor BRANCH
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'BRANCH' FROM public.roles r CROSS JOIN public.permissions p
WHERE r.key='seller' AND p.key IN ('sales.view','sales.create','cash.view','inventory.view')
ON CONFLICT DO NOTHING;

-- cashier / caixa BRANCH
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'BRANCH' FROM public.roles r CROSS JOIN public.permissions p
WHERE r.key='cashier' AND (p.module='cash' OR p.key='sales.view')
ON CONFLICT DO NOTHING;

-- viewer / visitante => *.view
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT r.id, p.id, 'COMPANY' FROM public.roles r CROSS JOIN public.permissions p
WHERE r.key='viewer' AND p.action='view'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- Authorization function
-- =====================================================================
CREATE OR REPLACE FUNCTION public.user_has_permission(
  _user_id uuid,
  _key text,
  _company_id uuid DEFAULT NULL,
  _branch_id uuid DEFAULT NULL,
  _department_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_master_owner(_user_id) THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.key = ur.role::text
      WHERE ur.user_id = _user_id AND r.key IN ('owner','admin')
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON p.id = up.permission_id
      WHERE up.user_id = _user_id AND p.key = _key AND up.granted = false
        AND (up.company_id IS NULL OR _company_id IS NULL OR up.company_id = _company_id)
        AND (up.branch_id  IS NULL OR _branch_id  IS NULL OR up.branch_id  = _branch_id)
    ) THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON p.id = up.permission_id
      WHERE up.user_id = _user_id AND p.key = _key AND up.granted = true
        AND (up.company_id IS NULL OR _company_id IS NULL OR up.company_id = _company_id)
        AND (up.branch_id  IS NULL OR _branch_id  IS NULL OR up.branch_id  = _branch_id)
        AND (up.department_id IS NULL OR _department_id IS NULL OR up.department_id = _department_id)
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.key = ur.role::text
      JOIN public.role_permissions rp ON rp.role_id = r.id
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = _user_id AND p.key = _key
        AND (
          rp.scope = 'GLOBAL'
          OR (rp.scope = 'COMPANY'    AND (_company_id    IS NULL OR ur.company_id    IS NULL OR ur.company_id    = _company_id))
          OR (rp.scope = 'BRANCH'     AND (_branch_id     IS NULL OR ur.branch_id     IS NULL OR ur.branch_id     = _branch_id))
          OR (rp.scope = 'DEPARTMENT' AND (_department_id IS NULL OR ur.department_id IS NULL OR ur.department_id = _department_id))
        )
    ) THEN true
    ELSE false
  END;
$$;
REVOKE ALL ON FUNCTION public.user_has_permission(uuid,text,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid,text,uuid,uuid,uuid) TO authenticated, service_role;

-- =====================================================================
-- Tenant backfill
-- =====================================================================
DO $$
DECLARE
  default_tenant_id uuid;
BEGIN
  SELECT id INTO default_tenant_id FROM public.tenants WHERE slug = 'default' LIMIT 1;
  IF default_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug, is_active)
    VALUES ('Default Tenant','default',true)
    RETURNING id INTO default_tenant_id;
  END IF;
  UPDATE public.companies SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
END $$;
