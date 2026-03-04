
-- Employees table for HR management
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  profile_id uuid REFERENCES public.profiles(id),
  full_name text NOT NULL,
  email text,
  phone text,
  position text NOT NULL DEFAULT 'Vendedor',
  department text NOT NULL DEFAULT 'Operações',
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  termination_date date,
  base_salary numeric NOT NULL DEFAULT 0,
  inss_number text,
  nuit text,
  bank_name text,
  bank_account text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payroll runs table
CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  overtime_amount numeric NOT NULL DEFAULT 0,
  bonus_amount numeric NOT NULL DEFAULT 0,
  gross_salary numeric NOT NULL DEFAULT 0,
  inss_employee numeric NOT NULL DEFAULT 0,
  inss_employer numeric NOT NULL DEFAULT 0,
  irps_amount numeric NOT NULL DEFAULT 0,
  other_deductions numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  paid_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, period_month, period_year)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

-- Employees RLS
CREATE POLICY "Admins manage employees" ON public.employees FOR ALL
  USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));

CREATE POLICY "Users view company employees" ON public.employees FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

-- Payroll RLS
CREATE POLICY "Admins manage payroll" ON public.payroll_runs FOR ALL
  USING (company_id = get_user_company(auth.uid()) AND is_admin(auth.uid()));

CREATE POLICY "Managers view payroll" ON public.payroll_runs FOR SELECT
  USING (company_id = get_user_company(auth.uid()) AND is_manager_or_admin(auth.uid()));
