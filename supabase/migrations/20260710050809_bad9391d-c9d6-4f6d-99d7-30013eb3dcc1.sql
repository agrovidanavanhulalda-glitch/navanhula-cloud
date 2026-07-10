
CREATE POLICY "Founders read backup objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'founder-backups' AND public.is_founder(auth.uid()));

CREATE POLICY "Founders write backup objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'founder-backups' AND public.is_founder(auth.uid()));

CREATE POLICY "Founders update backup objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'founder-backups' AND public.is_founder(auth.uid()));

CREATE POLICY "Founders delete backup objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'founder-backups' AND public.is_founder(auth.uid()));
