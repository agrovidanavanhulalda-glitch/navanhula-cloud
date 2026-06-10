
-- companies: drop unscoped CEO/global policies; keep scoped one
DROP POLICY IF EXISTS "CEO manages companies" ON public.companies;
DROP POLICY IF EXISTS "Global CEO manage all companies" ON public.companies;
CREATE POLICY "CEO manages own company"
ON public.companies FOR ALL TO authenticated
USING (public.is_ceo() AND id = public.get_user_company(auth.uid()))
WITH CHECK (public.is_ceo() AND id = public.get_user_company(auth.uid()));

-- user_roles: scope CEO management to own company
DROP POLICY IF EXISTS "CEO manages roles" ON public.user_roles;
CREATE POLICY "CEO manages roles in own company"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_ceo() AND company_id = public.get_user_company(auth.uid()))
WITH CHECK (public.is_ceo() AND company_id = public.get_user_company(auth.uid()));

-- referral_logs
DROP POLICY IF EXISTS "Admins view referral logs" ON public.referral_logs;
CREATE POLICY "Admins view referral logs in own company"
ON public.referral_logs FOR SELECT TO authenticated
USING ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo'))
       AND company_id = public.get_user_company(auth.uid()));

-- referral_signups
DROP POLICY IF EXISTS "Admins view referral signups" ON public.referral_signups;
CREATE POLICY "Admins view referral signups in own company"
ON public.referral_signups FOR SELECT TO authenticated
USING ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo'))
       AND company_id = public.get_user_company(auth.uid()));

-- reseller_clients
DROP POLICY IF EXISTS "Admins manage reseller clients" ON public.reseller_clients;
CREATE POLICY "Admins manage reseller clients in own company"
ON public.reseller_clients FOR ALL TO authenticated
USING ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo'))
       AND company_id = public.get_user_company(auth.uid()))
WITH CHECK ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo'))
       AND company_id = public.get_user_company(auth.uid()));

-- reseller_commissions
DROP POLICY IF EXISTS "Admins manage reseller commissions" ON public.reseller_commissions;
CREATE POLICY "Admins manage reseller commissions in own company"
ON public.reseller_commissions FOR ALL TO authenticated
USING ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo'))
       AND company_id = public.get_user_company(auth.uid()))
WITH CHECK ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo'))
       AND company_id = public.get_user_company(auth.uid()));

-- reseller_payouts
DROP POLICY IF EXISTS "Admins manage reseller payouts" ON public.reseller_payouts;
CREATE POLICY "Admins manage reseller payouts in own company"
ON public.reseller_payouts FOR ALL TO authenticated
USING ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo'))
       AND company_id = public.get_user_company(auth.uid()))
WITH CHECK ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo'))
       AND company_id = public.get_user_company(auth.uid()));

-- reseller_payout_items
DROP POLICY IF EXISTS "Admins manage payout items" ON public.reseller_payout_items;
CREATE POLICY "Admins manage payout items in own company"
ON public.reseller_payout_items FOR ALL TO authenticated
USING ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo'))
       AND company_id = public.get_user_company(auth.uid()))
WITH CHECK ((public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'ceo'))
       AND company_id = public.get_user_company(auth.uid()));
