
-- Make comunidade_media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'comunidade_media';

-- Drop existing storage policies for comunidade_media if any
DROP POLICY IF EXISTS "Public read comunidade_media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated uploads to comunidade_media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to comunidade_media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read comunidade_media" ON storage.objects;

-- Owner-only read policy
CREATE POLICY "Owner can read own media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comunidade_media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users can read media (needed for community feed)
CREATE POLICY "Authenticated users can read community media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'comunidade_media');

-- Owner-only upload
CREATE POLICY "Owner can upload own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comunidade_media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner-only delete
CREATE POLICY "Owner can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'comunidade_media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
