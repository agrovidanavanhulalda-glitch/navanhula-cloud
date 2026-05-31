-- Create table for detailed export attempt logs
CREATE TABLE IF NOT EXISTS public.export_attempts_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    export_history_id UUID REFERENCES public.export_history(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT ON public.export_attempts_logs TO authenticated;
GRANT ALL ON public.export_attempts_logs TO service_role;

-- Enable RLS
ALTER TABLE public.export_attempts_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view logs of their company's exports" 
ON public.export_attempts_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.export_history h
        WHERE h.id = export_history_id 
        AND h.company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert logs for their exports" 
ON public.export_attempts_logs 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.export_history h
        WHERE h.id = export_history_id 
        AND h.user_id = auth.uid()
    )
);
