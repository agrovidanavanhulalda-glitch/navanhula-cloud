-- Garantir que a tabela leads tenha os campos necessários
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'phone') THEN
        ALTER TABLE public.leads ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'business_name') THEN
        ALTER TABLE public.leads ADD COLUMN business_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email') THEN
        ALTER TABLE public.leads ADD COLUMN email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'converted_at') THEN
        ALTER TABLE public.leads ADD COLUMN converted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Criar tabela de notas se não existir
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Garantir RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Resetar políticas para evitar erros de duplicata
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;

CREATE POLICY "Admins can view all leads" 
ON public.leads FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'ceo')
    )
);

CREATE POLICY "Admins can insert leads" 
ON public.leads FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'ceo')
    )
);

CREATE POLICY "Admins can update leads" 
ON public.leads FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'ceo')
    )
);
