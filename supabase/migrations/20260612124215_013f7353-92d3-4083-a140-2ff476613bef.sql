
DROP POLICY IF EXISTS webhooks_select ON public.webhooks;
DROP POLICY IF EXISTS webhooks_insert ON public.webhooks;
DROP POLICY IF EXISTS webhooks_update ON public.webhooks;
DROP POLICY IF EXISTS webhooks_delete ON public.webhooks;

CREATE POLICY webhooks_select ON public.webhooks
  FOR SELECT TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'ceo'::app_role)
    )
  );

CREATE POLICY webhooks_insert ON public.webhooks
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'ceo'::app_role)
    )
  );

CREATE POLICY webhooks_update ON public.webhooks
  FOR UPDATE TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'ceo'::app_role)
    )
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'ceo'::app_role)
    )
  );

CREATE POLICY webhooks_delete ON public.webhooks
  FOR DELETE TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'ceo'::app_role)
    )
  );
