
-- 1. Fix is_ceo to not honor is_super_admin
CREATE OR REPLACE FUNCTION public.is_ceo()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.role = 'ceo' OR ur.role::text = 'CEO')
  );
END;
$function$;

-- 2. profiles: add INSERT policy & prevent self-promotion to super_admin
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND COALESCE(is_super_admin, false) = false);

-- Trigger to prevent escalation via UPDATE
CREATE OR REPLACE FUNCTION public.prevent_super_admin_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.is_super_admin, false) <> COALESCE(OLD.is_super_admin, false) THEN
      -- Only service_role or existing super admins may change this flag
      IF current_setting('request.jwt.claim.role', true) <> 'service_role'
         AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true) THEN
        RAISE EXCEPTION 'Not allowed to modify is_super_admin';
      END IF;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_super_admin, false) = true
       AND current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
      RAISE EXCEPTION 'Not allowed to set is_super_admin on insert';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_super_admin_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_super_admin_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_super_admin_escalation();

-- 3. background_tasks: replace public-readable tautology policy
DROP POLICY IF EXISTS "Users can view their company's tasks" ON public.background_tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.background_tasks;

CREATE POLICY "Company members can view background tasks"
  ON public.background_tasks
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Company members can create background tasks"
  ON public.background_tasks
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Service role manages background tasks"
  ON public.background_tasks
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. auth_flow_logs: add company scoping
ALTER TABLE public.auth_flow_logs ADD COLUMN IF NOT EXISTS company_id uuid;

DROP POLICY IF EXISTS "Admins can view auth flow logs" ON public.auth_flow_logs;
CREATE POLICY "Company admins can view auth flow logs"
  ON public.auth_flow_logs
  FOR SELECT TO authenticated
  USING (
    company_id IS NOT NULL
    AND company_id = public.get_user_company(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'ceo'::app_role, 'manager'::app_role)
    )
  );

-- 5. role_permissions: company scoping
DROP POLICY IF EXISTS "Role permissions admin/CEO read" ON public.role_permissions;
CREATE POLICY "Role permissions admin/CEO read"
  ON public.role_permissions
  FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ceo'::app_role))
    AND (company_id IS NULL OR company_id = public.get_user_company(auth.uid()))
  );

-- 6. Product images bucket: enforce company folder prefix
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;

CREATE POLICY "Company members can upload product images"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (public.get_user_company(auth.uid()))::text
  );

CREATE POLICY "Company members can update product images"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (public.get_user_company(auth.uid()))::text
  );

CREATE POLICY "Company members can delete product images"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (public.get_user_company(auth.uid()))::text
  );
