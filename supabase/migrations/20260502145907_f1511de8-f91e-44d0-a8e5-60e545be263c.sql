-- Ensure companies have the necessary fields
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'inactive'));
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_master boolean DEFAULT false;

-- Audit logs table check/fix
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    company_id uuid REFERENCES public.companies(id),
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    metadata jsonb,
    ip_address text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is Global CEO
CREATE OR REPLACE FUNCTION public.is_global_ceo()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.companies c ON p.company_id = c.id
    WHERE p.id = auth.uid() AND (c.is_master = true OR p.is_super_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS for audit_logs
DROP POLICY IF EXISTS "Global CEO view all logs" ON public.audit_logs;
CREATE POLICY "Global CEO view all logs" ON public.audit_logs
    FOR SELECT USING (is_global_ceo());

-- Policies for companies management
DROP POLICY IF EXISTS "Global CEO manage all companies" ON public.companies;
CREATE POLICY "Global CEO manage all companies" ON public.companies
    FOR ALL USING (is_global_ceo());

-- Policies for users management
DROP POLICY IF EXISTS "Global CEO view all profiles" ON public.profiles;
CREATE POLICY "Global CEO view all profiles" ON public.profiles
    FOR SELECT USING (is_global_ceo());

-- Alert functions
CREATE OR REPLACE FUNCTION public.get_companies_no_sales(days_count int DEFAULT 7)
RETURNS TABLE (company_id uuid, company_name text, last_sale_date timestamptz) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, MAX(s.created_at) as last_sale
  FROM public.companies c
  LEFT JOIN public.stores st ON st.company_id = c.id
  LEFT JOIN public.sales s ON s.store_id = st.id
  WHERE c.is_master = false AND c.is_active = true
  GROUP BY c.id, c.name
  HAVING MAX(s.created_at) IS NULL OR MAX(s.created_at) < (now() - (days_count || ' days')::interval);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
