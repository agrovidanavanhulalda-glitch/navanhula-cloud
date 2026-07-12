
ALTER TABLE public.fiscal_documents
  ADD COLUMN IF NOT EXISTS storage_paths JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS storage_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS xml_path TEXT,
  ADD COLUMN IF NOT EXISTS json_path TEXT,
  ADD COLUMN IF NOT EXISTS qr_path TEXT,
  ADD COLUMN IF NOT EXISTS metadata_path TEXT,
  ADD COLUMN IF NOT EXISTS checksum_sha256_path TEXT,
  ADD COLUMN IF NOT EXISTS checksum_md5_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'application/pdf',
  ADD COLUMN IF NOT EXISTS md5_hash TEXT,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ DEFAULT (now() + interval '10 years');

UPDATE public.fiscal_documents
SET retention_until = COALESCE(created_at, now()) + interval '10 years'
WHERE retention_until IS NULL;

CREATE INDEX IF NOT EXISTS idx_fiscal_docs_company_id ON public.fiscal_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_docs_store_id ON public.fiscal_documents(store_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_docs_created_at ON public.fiscal_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_docs_document_number ON public.fiscal_documents(document_number);
CREATE INDEX IF NOT EXISTS idx_fiscal_docs_status ON public.fiscal_documents(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_docs_pdf_path ON public.fiscal_documents(pdf_path);

CREATE OR REPLACE FUNCTION public.fiscal_document_storage_prefix(p_document_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id::text || '/fiscal/' ||
         to_char(created_at, 'YYYY') || '/' ||
         to_char(created_at, 'MM') || '/' ||
         id::text
  FROM public.fiscal_documents WHERE id = p_document_id;
$$;

CREATE OR REPLACE FUNCTION public.fiscal_is_founder(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_founder FROM public.profiles WHERE id = _user_id),
    false
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND account_type = 'FOUNDER'
  );
$$;

DROP POLICY IF EXISTS "Fiscal storage: company members read" ON storage.objects;
CREATE POLICY "Fiscal storage: company members read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'fiscal-documents' AND (
    public.fiscal_is_founder(auth.uid())
    OR (split_part(name, '/', 1))::uuid IN (SELECT c FROM public.get_user_company_ids() AS c)
  )
);

DROP POLICY IF EXISTS "Fiscal storage: company members write" ON storage.objects;
CREATE POLICY "Fiscal storage: company members write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fiscal-documents' AND (
    public.fiscal_is_founder(auth.uid())
    OR (split_part(name, '/', 1))::uuid IN (SELECT c FROM public.get_user_company_ids() AS c)
  )
);

DROP POLICY IF EXISTS "Fiscal storage: company members update" ON storage.objects;
CREATE POLICY "Fiscal storage: company members update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'fiscal-documents' AND (
    public.fiscal_is_founder(auth.uid())
    OR (split_part(name, '/', 1))::uuid IN (SELECT c FROM public.get_user_company_ids() AS c)
  )
);

DROP POLICY IF EXISTS "Fiscal storage: founder delete only" ON storage.objects;
CREATE POLICY "Fiscal storage: founder delete only"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'fiscal-documents' AND public.fiscal_is_founder(auth.uid())
);

CREATE OR REPLACE FUNCTION public.enforce_fiscal_retention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.fiscal_is_founder(auth.uid()) THEN
    INSERT INTO public.fiscal_audit_log (
      sale_id, company_id, store_id, fiscal_document_id, document_number,
      worker, status, error_code, source, started_at, finished_at
    ) VALUES (
      OLD.sale_id, OLD.company_id, OLD.store_id, OLD.id, OLD.document_number,
      'rls', 'BLOCKED', 'RETENTION_ACTIVE', 'trigger', now(), now()
    );
    RAISE EXCEPTION 'Documento fiscal em período de retenção legal — exclusão negada';
  END IF;

  IF OLD.retention_until IS NOT NULL AND OLD.retention_until > now() AND NOT public.fiscal_is_founder(auth.uid()) THEN
    RAISE EXCEPTION 'Retenção legal ativa até %', OLD.retention_until;
  END IF;

  INSERT INTO public.fiscal_audit_log (
    sale_id, company_id, store_id, fiscal_document_id, document_number,
    worker, status, actor_id, source, started_at, finished_at
  ) VALUES (
    OLD.sale_id, OLD.company_id, OLD.store_id, OLD.id, OLD.document_number,
    'founder', 'DELETED', auth.uid(), 'trigger', now(), now()
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_fiscal_retention ON public.fiscal_documents;
CREATE TRIGGER trg_enforce_fiscal_retention
BEFORE DELETE ON public.fiscal_documents
FOR EACH ROW EXECUTE FUNCTION public.enforce_fiscal_retention();

CREATE OR REPLACE FUNCTION public.get_fiscal_document_url(
  p_document_id UUID,
  p_kind TEXT DEFAULT 'pdf',
  p_expires_in INT DEFAULT 60
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage
AS $$
DECLARE
  v_doc public.fiscal_documents%ROWTYPE;
  v_path TEXT;
BEGIN
  SELECT * INTO v_doc FROM public.fiscal_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  IF NOT (public.fiscal_is_founder(auth.uid())
          OR v_doc.company_id IN (SELECT c FROM public.get_user_company_ids() AS c)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  v_path := CASE p_kind
    WHEN 'pdf' THEN v_doc.pdf_path
    WHEN 'xml' THEN v_doc.xml_path
    WHEN 'json' THEN v_doc.json_path
    WHEN 'qr' THEN v_doc.qr_path
    WHEN 'metadata' THEN v_doc.metadata_path
    WHEN 'checksum_sha256' THEN v_doc.checksum_sha256_path
    WHEN 'checksum_md5' THEN v_doc.checksum_md5_path
    ELSE NULL
  END;

  IF v_path IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'FILE_NOT_UPLOADED', 'kind', p_kind);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bucket', 'fiscal-documents',
    'path', v_path,
    'expires_in', GREATEST(p_expires_in, 30),
    'document_id', v_doc.id,
    'document_number', v_doc.document_number
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rebuild_fiscal_document_metadata(p_document_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_doc public.fiscal_documents%ROWTYPE;
  v_meta JSONB;
BEGIN
  SELECT * INTO v_doc FROM public.fiscal_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  v_meta := jsonb_build_object(
    'document_id', v_doc.id,
    'sale_id', v_doc.sale_id,
    'company_id', v_doc.company_id,
    'store_id', v_doc.store_id,
    'document_number', v_doc.document_number,
    'issue_date', v_doc.created_at,
    'hash_sha256', v_doc.content_hash,
    'hash_md5', v_doc.md5_hash,
    'checksum', v_doc.checksum,
    'mime_type', v_doc.mime_type,
    'file_size', v_doc.file_size_bytes,
    'storage_paths', v_doc.storage_paths,
    'version', v_doc.storage_version,
    'retention_until', v_doc.retention_until,
    'rebuilt_at', now()
  );

  UPDATE public.fiscal_documents
  SET metadata_json = v_meta, updated_at = now()
  WHERE id = p_document_id;

  RETURN jsonb_build_object('success', true, 'metadata', v_meta);
END;
$$;

CREATE OR REPLACE FUNCTION public.repair_fiscal_document_metadata(p_document_id UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.rebuild_fiscal_document_metadata(p_document_id);
$$;

CREATE OR REPLACE FUNCTION public.verify_fiscal_document_checksum(p_document_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_doc public.fiscal_documents%ROWTYPE;
  v_canonical TEXT;
  v_md5 TEXT;
BEGIN
  SELECT * INTO v_doc FROM public.fiscal_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  v_canonical := public.fiscal_document_canonical(p_document_id)::text;
  v_md5 := encode(digest(v_canonical, 'md5'), 'hex');

  UPDATE public.fiscal_documents
  SET md5_hash = v_md5,
      checksum = v_md5,
      integrity_checked_at = now(),
      integrity_status = CASE
        WHEN v_doc.md5_hash IS NULL OR v_doc.md5_hash = v_md5 THEN 'valid'
        ELSE 'corrupted'
      END
  WHERE id = p_document_id;

  RETURN jsonb_build_object(
    'success', true,
    'md5', v_md5,
    'previous_md5', v_doc.md5_hash,
    'match', v_doc.md5_hash IS NULL OR v_doc.md5_hash = v_md5
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fiscal_document_request_regeneration(p_document_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_doc public.fiscal_documents%ROWTYPE;
  v_task_id UUID;
BEGIN
  SELECT * INTO v_doc FROM public.fiscal_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  IF NOT (public.fiscal_is_founder(auth.uid())
          OR v_doc.company_id IN (SELECT c FROM public.get_user_company_ids() AS c)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  INSERT INTO public.background_tasks (task_type, status, payload, max_attempts, next_retry_at)
  VALUES (
    'REGENERATE_FISCAL_DOCUMENT', 'PENDING',
    jsonb_build_object(
      'document_id', p_document_id,
      'sale_id', v_doc.sale_id,
      'requested_by', auth.uid(),
      'reason', 'manual_regeneration'
    ),
    3, now()
  )
  RETURNING id INTO v_task_id;

  UPDATE public.fiscal_documents
  SET storage_version = storage_version + 1, updated_at = now()
  WHERE id = p_document_id;

  INSERT INTO public.fiscal_audit_log (
    job_id, sale_id, company_id, store_id, fiscal_document_id, document_number,
    worker, status, actor_id, source, started_at, finished_at
  ) VALUES (
    v_task_id, v_doc.sale_id, v_doc.company_id, v_doc.store_id,
    v_doc.id, v_doc.document_number,
    'user', 'ENQUEUED_REGENERATION', auth.uid(), 'rpc', now(), now()
  );

  RETURN jsonb_build_object('success', true, 'task_id', v_task_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_fiscal_document_url(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_fiscal_document_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_fiscal_document_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_fiscal_document_checksum(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_document_request_regeneration(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_document_storage_prefix(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_is_founder(UUID) TO authenticated;
