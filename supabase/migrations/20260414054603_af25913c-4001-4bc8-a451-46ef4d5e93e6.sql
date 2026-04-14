
-- 1. FIX: company_invitations - prevent token enumeration
-- Drop the overly permissive policy that lets anyone read ALL active tokens
DROP POLICY IF EXISTS "Anyone can read active invite by token" ON public.company_invitations;

-- Create a secure RPC function that validates a specific token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS SETOF public.company_invitations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.company_invitations
  WHERE token = p_token
    AND status = 'active'
    AND expires_at > now()
    AND used_count < max_uses
  LIMIT 1;
$$;

-- Add a restricted policy: authenticated users in the same company can view invitations
CREATE POLICY "Company members can view their invitations"
ON public.company_invitations
FOR SELECT
TO authenticated
USING (company_id IN (SELECT public.get_user_company_ids()));

-- 2. FIX: community_media - remove anonymous access
DROP POLICY IF EXISTS "Anyone can view community media" ON storage.objects;

-- Also fix the INSERT policy that uses {public} role but checks auth.uid()
DROP POLICY IF EXISTS "Authenticated users can upload community media" ON storage.objects;
CREATE POLICY "Authenticated users can upload community media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comunidade_media' AND auth.uid() IS NOT NULL);

-- Also fix the DELETE policy on {public} role
DROP POLICY IF EXISTS "Users can delete own community media" ON storage.objects;
CREATE POLICY "Users can delete own community media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'comunidade_media' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 3. FIX: profiles - scope admin access to same company
DROP POLICY IF EXISTS "Users can view own profile or admin views all" ON public.profiles;

CREATE POLICY "Users can view own profile or company admins"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR (
    public.is_admin(auth.uid())
    AND company_id = public.get_user_company(auth.uid())
  )
  OR public.has_role(auth.uid(), 'ceo')
);
