-- Drop existing restrictive policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a single permissive SELECT policy that allows users to view their own profile OR admins to view all
CREATE POLICY "Users can view own profile or admin views all"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR is_admin(auth.uid()));