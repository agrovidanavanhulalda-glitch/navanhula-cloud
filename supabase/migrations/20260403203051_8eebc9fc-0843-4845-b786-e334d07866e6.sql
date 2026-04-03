
-- Compliance obligations table
CREATE TABLE public.obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'imposto',
  frequency TEXT NOT NULL DEFAULT 'mensal',
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Obligation documents table
CREATE TABLE public.obligation_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES public.obligations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligation_documents ENABLE ROW LEVEL SECURITY;

-- RLS for obligations
CREATE POLICY "Users can view own company obligations"
ON public.obligations FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can insert own company obligations"
ON public.obligations FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can update own company obligations"
ON public.obligations FOR UPDATE TO authenticated
USING (company_id = public.get_user_company(auth.uid()))
WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can delete own company obligations"
ON public.obligations FOR DELETE TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

-- RLS for obligation_documents
CREATE POLICY "Users can view own company obligation docs"
ON public.obligation_documents FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can insert own company obligation docs"
ON public.obligation_documents FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can delete own company obligation docs"
ON public.obligation_documents FOR DELETE TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

-- Storage bucket for compliance documents
INSERT INTO storage.buckets (id, name, public) VALUES ('compliance_docs', 'compliance_docs', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload compliance docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'compliance_docs');

CREATE POLICY "Users can view own compliance docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'compliance_docs');

CREATE POLICY "Users can delete own compliance docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'compliance_docs');
