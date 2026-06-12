
CREATE OR REPLACE FUNCTION public.role_level(_role app_role)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _role::text
    WHEN 'ceo' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'seller' THEN 2
    WHEN 'cashier' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END
$$;

CREATE OR REPLACE FUNCTION public.max_user_role_level(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(MAX(public.role_level(role)), 0)
  FROM public.user_roles WHERE user_id = _user_id
$$;

-- 1. agro_orders INSERT
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='agro_orders' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.agro_orders', pol.policyname); END LOOP;
END $$;
CREATE POLICY "agro_orders_insert_company_scoped" ON public.agro_orders FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND company_id = public.get_user_company(auth.uid()));

-- 2. community_comments INSERT
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='community_comments' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.community_comments', pol.policyname); END LOOP;
END $$;
CREATE POLICY "community_comments_insert_own_company" ON public.community_comments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND company_id = public.get_user_company(auth.uid()));

-- 3. invitations DELETE/UPDATE
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='invitations' AND cmd IN ('DELETE','UPDATE')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.invitations', pol.policyname); END LOOP;
END $$;
CREATE POLICY "invitations_delete_admin_ceo" ON public.invitations FOR DELETE TO authenticated
USING (company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role)));
CREATE POLICY "invitations_update_admin_ceo" ON public.invitations FOR UPDATE TO authenticated
USING (company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role)))
WITH CHECK (company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'ceo'::app_role)));

-- 4. obligations write
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='obligations' AND cmd IN ('INSERT','UPDATE','DELETE')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.obligations', pol.policyname); END LOOP;
END $$;
CREATE POLICY "obligations_insert_managers" ON public.obligations FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)));
CREATE POLICY "obligations_update_managers" ON public.obligations FOR UPDATE TO authenticated
USING (company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)))
WITH CHECK (company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)));
CREATE POLICY "obligations_delete_managers" ON public.obligations FOR DELETE TO authenticated
USING (company_id = public.get_user_company(auth.uid())
  AND (public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)));

-- 5. payment_logs INSERT
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='payment_logs' AND cmd IN ('INSERT','UPDATE','DELETE')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.payment_logs', pol.policyname); END LOOP;
END $$;
CREATE POLICY "payment_logs_insert_admin_only" ON public.payment_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role));

-- 6. scheduled_payments write
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='scheduled_payments' AND cmd IN ('INSERT','UPDATE','DELETE')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.scheduled_payments', pol.policyname); END LOOP;
END $$;
CREATE POLICY "scheduled_payments_insert_managers" ON public.scheduled_payments FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
  AND (public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)));
CREATE POLICY "scheduled_payments_update_managers" ON public.scheduled_payments FOR UPDATE TO authenticated
USING (company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
  AND (public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)))
WITH CHECK (company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
  AND (public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)));
CREATE POLICY "scheduled_payments_delete_managers" ON public.scheduled_payments FOR DELETE TO authenticated
USING (company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
  AND (public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role)));

-- 7. user_roles privilege escalation guard
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_roles'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname); END LOOP;
END $$;
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role));
CREATE POLICY "user_roles_insert_no_escalation" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK ((public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role))
  AND public.role_level(role) < public.max_user_role_level(auth.uid()));
CREATE POLICY "user_roles_update_no_escalation" ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role))
WITH CHECK ((public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role))
  AND public.role_level(role) < public.max_user_role_level(auth.uid())
  AND user_id <> auth.uid());
CREATE POLICY "user_roles_delete_admin" ON public.user_roles FOR DELETE TO authenticated
USING ((public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'ceo'::app_role))
  AND public.role_level(role) < public.max_user_role_level(auth.uid()));
