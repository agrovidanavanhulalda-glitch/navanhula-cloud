
-- Make payment-proofs bucket private
UPDATE storage.buckets SET public = false WHERE id = 'payment-proofs';

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view proofs" ON storage.objects;

-- Create company-scoped SELECT policy for payment proofs
CREATE POLICY "Company members can view payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.companies
    WHERE id IN (SELECT public.get_user_company_ids())
  )
);
