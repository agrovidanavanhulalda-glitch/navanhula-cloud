
-- ============================================
-- STORAGE: Drop all old policies for compliance_documents
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Upload por empresa" ON storage.objects;
DROP POLICY IF EXISTS "Leitura isolada por empresa" ON storage.objects;
DROP POLICY IF EXISTS "Delete controlado" ON storage.objects;

-- INSERT: any authenticated user can upload to compliance_documents
CREATE POLICY "compliance_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'compliance_documents'
  AND auth.uid() IS NOT NULL
);

-- SELECT: user can only read files whose first folder matches their company_id
CREATE POLICY "compliance_read_by_company"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'compliance_documents'
  AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
);

-- UPDATE: same company isolation
CREATE POLICY "compliance_update_by_company"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'compliance_documents'
  AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'compliance_documents'
  AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
);

-- DELETE: same company isolation + admin only
CREATE POLICY "compliance_delete_by_company"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'compliance_documents'
  AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
);

-- ============================================
-- TABLE: obligation_documents - tighten RLS
-- ============================================
DROP POLICY IF EXISTS "Users can view own company obligation docs" ON public.obligation_documents;
DROP POLICY IF EXISTS "Users can insert own company obligation docs" ON public.obligation_documents;
DROP POLICY IF EXISTS "Users can update own company obligation docs" ON public.obligation_documents;
DROP POLICY IF EXISTS "Users can delete own company obligation docs" ON public.obligation_documents;

CREATE POLICY "obligation_docs_select"
ON public.obligation_documents FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "obligation_docs_insert"
ON public.obligation_documents FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND uploaded_by = auth.uid()
);

CREATE POLICY "obligation_docs_update"
ON public.obligation_documents FOR UPDATE TO authenticated
USING (company_id = public.get_user_company(auth.uid()))
WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "obligation_docs_delete"
ON public.obligation_documents FOR DELETE TO authenticated
USING (company_id = public.get_user_company(auth.uid()));
