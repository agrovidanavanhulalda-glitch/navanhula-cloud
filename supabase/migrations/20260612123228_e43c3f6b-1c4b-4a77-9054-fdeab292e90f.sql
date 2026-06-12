
DROP POLICY IF EXISTS "Company members can view own payment logs" ON public.payment_logs;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='invitations' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invitations', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Only admins/ceo can create invitations"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ceo'::app_role)
  )
  AND (
    role IS NULL
    OR role <> 'ceo'
    OR public.has_role(auth.uid(), 'ceo'::app_role)
  )
);

DROP POLICY IF EXISTS "comunidade_media owner can update" ON storage.objects;
CREATE POLICY "comunidade_media owner can update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'comunidade_media'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'comunidade_media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "payment-proofs company can delete" ON storage.objects;
CREATE POLICY "payment-proofs company can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
);
