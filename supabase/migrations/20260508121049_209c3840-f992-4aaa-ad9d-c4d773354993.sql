CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their company invitations"
    ON public.invitations FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create company invitations"
    ON public.invitations FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their company invitations"
    ON public.invitations FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their company invitations"
    ON public.invitations FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));
