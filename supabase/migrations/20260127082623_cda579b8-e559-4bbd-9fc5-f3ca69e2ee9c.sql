-- Fix permissive RLS policy for audit_logs
-- The "System can insert audit logs" policy was too permissive

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a more restrictive policy that only allows authenticated users to insert their own audit logs
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);