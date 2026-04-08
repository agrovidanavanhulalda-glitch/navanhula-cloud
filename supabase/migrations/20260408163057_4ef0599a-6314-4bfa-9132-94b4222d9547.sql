
-- Create bucket if not exists (already handled by ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance_documents',
  'compliance_documents',
  false,
  52428800,
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg'];

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Authenticated users can read compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update compliance docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete compliance docs" ON storage.objects;

CREATE POLICY "Authenticated users can read compliance docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'compliance_documents');

CREATE POLICY "Authenticated users can upload compliance docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'compliance_documents');

CREATE POLICY "Authenticated users can update compliance docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'compliance_documents');

CREATE POLICY "Admins can delete compliance docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'compliance_documents' AND public.is_admin(auth.uid()));
