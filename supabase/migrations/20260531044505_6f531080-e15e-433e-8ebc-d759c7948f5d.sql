-- Extend system_audit_logs to support user-specific auditing if needed
ALTER TABLE public.system_audit_logs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS transaction_id UUID DEFAULT gen_random_uuid();

-- Create a more specialized table for user creation/invite auditing as requested
CREATE TABLE IF NOT EXISTS public.auth_event_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'signup', 'invite', 'manual_creation'
    actor_id UUID REFERENCES auth.users(id), -- Who performed the action (null for self-signup)
    target_user_id UUID NOT NULL, -- The user being created/invited
    company_id UUID,
    branch_id UUID,
    role_key TEXT NOT NULL, -- The technical role key (admin, manager, seller)
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT ON public.auth_event_logs TO authenticated;
GRANT ALL ON public.auth_event_logs TO service_role;

-- Enable RLS
ALTER TABLE public.auth_event_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all auth event logs"
ON public.auth_event_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'ceo')
  )
);

CREATE POLICY "Service role can do everything on auth event logs"
ON public.auth_event_logs
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');
