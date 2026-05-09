-- Allow admins to insert profiles for new users
CREATE POLICY "Admins can insert profiles for new users" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = profiles.company_id 
    AND cu.role IN ('admin', 'ceo', 'owner')
  )
);

-- Allow admins to insert company_users records
CREATE POLICY "Admins can insert company_users records" 
ON public.company_users 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = company_users.company_id 
    AND cu.role IN ('admin', 'ceo', 'owner')
  )
);

-- Ensure company_invitations policies are broad enough for direct management
DROP POLICY IF EXISTS "Company admins manage invitations" ON public.company_invitations;
CREATE POLICY "Company admins manage invitations" 
ON public.company_invitations 
FOR ALL 
USING (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'owner'))
)
WITH CHECK (
  company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND role IN ('admin', 'ceo', 'owner'))
);
