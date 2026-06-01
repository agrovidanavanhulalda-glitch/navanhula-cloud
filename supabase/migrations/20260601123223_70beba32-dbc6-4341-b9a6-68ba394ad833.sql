-- Create task status enum
DO $$ BEGIN
    CREATE TYPE public.task_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the background tasks table
CREATE TABLE IF NOT EXISTS public.background_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    task_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status public.task_status NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_background_tasks_status_next_retry ON public.background_tasks (status, next_retry_at) 
WHERE status IN ('PENDING', 'RETRY');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.background_tasks TO authenticated;
GRANT ALL ON public.background_tasks TO service_role;

-- Enable RLS
ALTER TABLE public.background_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their company's tasks" 
ON public.background_tasks FOR SELECT 
USING (company_id IN (SELECT id FROM public.companies WHERE id = background_tasks.company_id));

CREATE POLICY "Users can create tasks" 
ON public.background_tasks FOR INSERT 
WITH CHECK (true);

-- Update trigger for updated_at
CREATE TRIGGER update_background_tasks_updated_at
BEFORE UPDATE ON public.background_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
