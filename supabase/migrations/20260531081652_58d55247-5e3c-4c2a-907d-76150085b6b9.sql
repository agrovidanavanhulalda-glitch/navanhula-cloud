-- Create export history table
CREATE TABLE public.export_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    type TEXT NOT NULL CHECK (type IN ('PDF', 'XLSX')),
    filters JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT ON public.export_history TO authenticated;
GRANT ALL ON public.export_history TO service_role;

-- Enable RLS
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own export history"
ON public.export_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export history"
ON public.export_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_export_history_user_id ON public.export_history(user_id);
CREATE INDEX idx_export_history_company_id ON public.export_history(company_id);
