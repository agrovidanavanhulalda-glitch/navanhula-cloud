
-- Add company_id to system_audit_logs
ALTER TABLE public.system_audit_logs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Admins can read system audit logs" ON public.system_audit_logs;
DROP POLICY IF EXISTS "CEO and Admin can view audit logs" ON public.system_audit_logs;

-- Create company-scoped policy
CREATE POLICY "Admins can read own company system audit logs"
ON public.system_audit_logs FOR SELECT TO authenticated
USING (
  (public.has_role(auth.uid(), 'ceo') OR public.is_admin(auth.uid()))
  AND (company_id IS NULL OR company_id = public.get_user_company(auth.uid()))
);
