INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance_documents',
  'compliance_documents',
  false,
  52428800,
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete compliance docs" ON storage.objects;

CREATE POLICY "Allow authenticated upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'compliance_documents');

CREATE POLICY "Allow authenticated read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'compliance_documents');

CREATE POLICY "Allow authenticated update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'compliance_documents')
WITH CHECK (bucket_id = 'compliance_documents');

CREATE POLICY "Admins can delete compliance docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'compliance_documents' AND public.is_admin(auth.uid()));

ALTER TABLE public.obligation_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company obligation docs" ON public.obligation_documents;
DROP POLICY IF EXISTS "Users can insert own company obligation docs" ON public.obligation_documents;
DROP POLICY IF EXISTS "Users can delete own company obligation docs" ON public.obligation_documents;
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.obligation_documents;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.obligation_documents;
DROP POLICY IF EXISTS "Allow update for authenticated" ON public.obligation_documents;
DROP POLICY IF EXISTS "Allow delete for admins" ON public.obligation_documents;

CREATE POLICY "Users can view own company obligation docs"
ON public.obligation_documents
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can insert own company obligation docs"
ON public.obligation_documents
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Users can update own company obligation docs"
ON public.obligation_documents
FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company(auth.uid()))
WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can delete own company obligation docs"
ON public.obligation_documents
FOR DELETE
TO authenticated
USING (company_id = public.get_user_company(auth.uid()));